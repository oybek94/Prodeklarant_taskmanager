import TelegramBot from 'node-telegram-bot-api';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import {
  CARGO_STEPS,
  CargoData,
  CargoStep,
  ChoiceOption,
  formatCargoMessage,
  orderCustomsOptions,
  parseStepInput,
  splitContractLines,
} from './client-cargo-form';
import { linkGroupByCode, migrateBotGroupChatId } from './client-cargo-bot-link.service';

// Mijozlar uchun yuk ma'lumotlari boti. Mijoz o'z guruhida /yangi yozadi, bot 12 ta savol beradi
// va tartibli xabarni shu guruhga yuboradi. Forma bazaga yozilmaydi (faqat mahsulot nomlari eslab qolinadi).

let bot: TelegramBot | null = null;

const FORM_TTL_MS = 30 * 60 * 1000;
const MAX_CHOICE_BUTTONS = 40;
const LINK_ATTEMPT_LIMIT = 10;
const LINK_ATTEMPT_WINDOW_MS = 60 * 60 * 1000;

interface ContractOption {
  contractNumber: string;
  buyerName: string;
  contractCurrency: string | null;
  deliveryTerms: string | null;
  customsAddress: string | null;
  destinationPlaces: string | null;
}

interface FormState {
  /** Tugmalar shu forma uchunligini tekshirish uchun (eskirgan tugmalar e'tiborsiz qoladi) */
  token: string;
  clientId: number;
  chatId: number;
  userId: number;
  stepIndex: number;
  data: CargoData;
  contracts: ContractOption[];
  contract: ContractOption | null;
  /** Tanlangan shaharning shartnomadagi qator indeksi (bojxona juftini birinchi qo'yish uchun) */
  cityRawIndex: number | undefined;
  productNames: string[];
  options: ChoiceOption[];
  promptMessageId: number | null;
  promptText: string;
  /** Keyingi to'g'ri javobda chatdan o'chiriladigan xabarlar: /yangi buyrug'i, foydalanuvchi javoblari, xato izohlari */
  trash: number[];
  busy: boolean;
  updatedAt: number;
}

const forms = new Map<string, FormState>();
const linkAttempts = new Map<number, { count: number; resetAt: number }>();

const formKey = (chatId: number, userId: number) => `${chatId}:${userId}`;

const skipCancelRow = (token: string): TelegramBot.InlineKeyboardButton[] => [
  { text: "⏭ O'tkazib yuborish", callback_data: `cg:${token}:s` },
  { text: '❌ Bekor qilish', callback_data: `cg:${token}:x` },
];

function buyerOptions(contracts: ContractOption[]): ChoiceOption[] {
  const nameCount = new Map<string, number>();
  for (const c of contracts) nameCount.set(c.buyerName, (nameCount.get(c.buyerName) ?? 0) + 1);
  return contracts.map((c, rawIndex) => ({
    // Bir xil nomli sotib oluvchilar bir nechta shartnomada bo'lsa, shartnoma raqami bilan farqlanadi
    text: (nameCount.get(c.buyerName) ?? 0) > 1 ? `${c.buyerName} · №${c.contractNumber}` : c.buyerName,
    rawIndex,
  }));
}

function optionsForStep(state: FormState, step: CargoStep): ChoiceOption[] {
  const contract = state.contract;
  let options: ChoiceOption[] = [];
  switch (step.key) {
    case 'buyer':
      options = buyerOptions(state.contracts);
      break;
    case 'city':
      options = contract ? splitContractLines(contract.deliveryTerms) : [];
      break;
    case 'product':
      options = state.productNames.map((text, rawIndex) => ({ text, rawIndex }));
      break;
    case 'customs':
      options = contract ? orderCustomsOptions(splitContractLines(contract.customsAddress), state.cityRawIndex) : [];
      break;
    case 'unloading':
      options = contract ? splitContractLines(contract.destinationPlaces) : [];
      break;
    default:
      break;
  }
  return options.slice(0, MAX_CHOICE_BUTTONS);
}

async function askStep(state: FormState): Promise<void> {
  const step = CARGO_STEPS[state.stepIndex];
  state.options = step.kind === 'choice' ? optionsForStep(state, step) : [];

  let text = `(${state.stepIndex + 1}/${CARGO_STEPS.length}) ${step.question}`;
  if (step.kind === 'choice' && state.options.length === 0) {
    text += "\n(Variant topilmadi — o'zingiz yozing)";
  }
  const keyboard: TelegramBot.InlineKeyboardButton[][] = state.options.map((o, i) => [
    { text: o.text, callback_data: `cg:${state.token}:o:${i}` },
  ]);
  keyboard.push(skipCancelRow(state.token));

  const sent = await bot!.sendMessage(state.chatId, text, { reply_markup: { inline_keyboard: keyboard } });
  state.promptMessageId = sent.message_id;
  state.promptText = text;
}

/**
 * Chatni tozalaydi. Foydalanuvchi xabarlarini guruhda faqat "Xabarlarni o'chirish" huquqi bor admin bot
 * o'chira oladi; o'chmasa (huquq yo'q, 48 soatdan eski) forma baribir davom etadi.
 */
async function deleteMessages(chatId: number, ids: Array<number | null>): Promise<void> {
  const unique = [...new Set(ids.filter((id): id is number => id !== null))];
  await Promise.allSettled(unique.map((id) => bot!.deleteMessage(chatId, id)));
}

async function rememberProduct(clientId: number, name: string): Promise<void> {
  const existing = await prisma.clientBotProduct.findFirst({
    where: { clientId, name: { equals: name, mode: 'insensitive' } },
    select: { id: true },
  });
  if (existing) return;
  try {
    await prisma.clientBotProduct.create({ data: { clientId, name } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return;
    throw e;
  }
}

async function finishForm(state: FormState): Promise<void> {
  forms.delete(formKey(state.chatId, state.userId));
  const message = formatCargoMessage(state.data, state.contract?.contractCurrency ?? null);
  if (!message) {
    await bot!.sendMessage(state.chatId, "Hech narsa kiritilmadi, guruhga hech narsa yuborilmadi. Qaytadan boshlash: /yangi");
    return;
  }
  await bot!.sendMessage(state.chatId, message, { parse_mode: 'HTML' });
  if (state.data.product) {
    try {
      await rememberProduct(state.clientId, state.data.product);
    } catch (e) {
      console.error('[ClientCargoBot] Mahsulot nomini saqlashda xatolik:', e instanceof Error ? e.message : e);
    }
  }
}

/** Javobni qayd etadi (value=null — o'tkazib yuborildi) va keyingi savolga o'tadi */
async function recordAnswer(state: FormState, value: string | null, picked?: ChoiceOption): Promise<void> {
  const step = CARGO_STEPS[state.stepIndex];
  if (value !== null) {
    state.data[step.key] = value;
    if (step.key === 'buyer') {
      state.contract = picked ? (state.contracts[picked.rawIndex] ?? null) : null;
    }
    if (step.key === 'city') {
      state.cityRawIndex = picked?.rawIndex;
    }
  }
  state.updatedAt = Date.now();
  // Javob xotiraga (state.data) yozildi — endi savol va yozilgan javoblar chatdan o'chadi.
  // Avval keyingi xabar yuboriladi, so'ng eskilari o'chadi: guruhda oraliq "bo'sh" holat ko'rinmaydi.
  const stale = [state.promptMessageId, ...state.trash.splice(0)];
  state.stepIndex += 1;
  if (state.stepIndex >= CARGO_STEPS.length) {
    await finishForm(state);
  } else {
    await askStep(state);
  }
  await deleteMessages(state.chatId, stale);
}

/** busy bayrog'i bilan: ikki marta bosish/yozish bir qadamni ikki marta o'tkazib yubormasin */
async function withFormLock(state: FormState, action: () => Promise<void>): Promise<void> {
  if (state.busy) return;
  state.busy = true;
  try {
    await action();
  } finally {
    state.busy = false;
  }
}

async function startForm(chatId: number, userId: number, commandMessageId: number): Promise<void> {
  const client = await prisma.client.findUnique({
    where: { botGroupChatId: String(chatId) },
    select: { id: true },
  });
  if (!client) {
    await bot!.sendMessage(
      chatId,
      "Bu guruh hali mijozga ulanmagan. Prodeklarant'dan ulash kodini oling va guruhga /ulash KOD deb yozing."
    );
    return;
  }

  const [contracts, products] = await Promise.all([
    prisma.contract.findMany({
      where: { clientId: client.id },
      orderBy: { contractDate: 'desc' },
      take: MAX_CHOICE_BUTTONS,
      select: {
        contractNumber: true,
        buyerName: true,
        contractCurrency: true,
        deliveryTerms: true,
        customsAddress: true,
        destinationPlaces: true,
      },
    }),
    prisma.clientBotProduct.findMany({
      where: { clientId: client.id },
      orderBy: { name: 'asc' },
      take: MAX_CHOICE_BUTTONS,
      select: { name: true },
    }),
  ]);

  const state: FormState = {
    token: randomBytes(3).toString('hex'),
    clientId: client.id,
    chatId,
    userId,
    stepIndex: 0,
    data: {},
    contracts,
    contract: null,
    cityRawIndex: undefined,
    productNames: products.map((p) => p.name),
    options: [],
    promptMessageId: null,
    promptText: '',
    trash: [commandMessageId],
    busy: false,
    updatedAt: Date.now(),
  };
  // Shu foydalanuvchining oldingi tugallanmagan formasi almashtiriladi: eski savol va javoblari chatdan o'chadi
  const previous = forms.get(formKey(chatId, userId));
  forms.set(formKey(chatId, userId), state);
  await askStep(state);
  if (previous) await deleteMessages(chatId, [previous.promptMessageId, ...previous.trash]);
}

function isLinkRateLimited(chatId: number): boolean {
  const now = Date.now();
  const entry = linkAttempts.get(chatId);
  if (!entry || entry.resetAt <= now) {
    linkAttempts.set(chatId, { count: 1, resetAt: now + LINK_ATTEMPT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > LINK_ATTEMPT_LIMIT;
}

async function handleLink(chatId: number, code: string | undefined): Promise<void> {
  if (!code) {
    await bot!.sendMessage(chatId, "Kodni ham yozing: /ulash KOD. Kodni Prodeklarant'dagi mijoz kartasidan oling.");
    return;
  }
  if (isLinkRateLimited(chatId)) {
    await bot!.sendMessage(chatId, "Juda ko'p urinish. Bir soatdan keyin qayta urinib ko'ring.");
    return;
  }
  const result = await linkGroupByCode(code, String(chatId));
  if (result.ok) {
    await bot!.sendMessage(chatId, `✅ Guruh «${result.clientName}» mijoziga ulandi.\nYuk ma'lumotini kiritish uchun /yangi deb yozing.`);
  } else if (result.reason === 'GROUP_TAKEN') {
    await bot!.sendMessage(chatId, "Bu guruh allaqachon mijozga ulangan. Avval Prodeklarant'da uni uzing.");
  } else {
    await bot!.sendMessage(chatId, "Kod noto'g'ri yoki muddati o'tgan. Prodeklarant'dan yangi kod oling.");
  }
}

function registerHandlers(instance: TelegramBot): void {
  const reportError = (where: string, chatId: number, e: unknown) => {
    console.error(`[ClientCargoBot] ${where} xatosi:`, e instanceof Error ? e.message : e);
    instance.sendMessage(chatId, 'Xatolik yuz berdi. Qaytadan urinib ko\'ring: /yangi').catch(() => undefined);
  };
  const requireGroup = async (msg: TelegramBot.Message): Promise<boolean> => {
    if (msg.chat.type === 'private') {
      await instance.sendMessage(msg.chat.id, 'Bu bot mijozning Telegram guruhida ishlaydi. Botni guruhga qo\'shing va guruhda yozing.');
      return false;
    }
    return true;
  };

  instance.onText(/^\/(?:start|help)(?:@\w+)?\s*$/, async (msg) => {
    await instance.sendMessage(
      msg.chat.id,
      "Yuk ma'lumotlarini yig'uvchi bot.\n\n/yangi — yangi yuk ma'lumotini kiritish\n/bekor — joriy formani bekor qilish\n/ulash KOD — guruhni mijozga ulash (bir marta)"
    );
  });

  instance.onText(/^\/ulash(?:@\w+)?(?:\s+(\S+))?\s*$/, async (msg, match) => {
    try {
      if (!(await requireGroup(msg))) return;
      await handleLink(msg.chat.id, match?.[1]);
    } catch (e) {
      reportError('/ulash', msg.chat.id, e);
    }
  });

  instance.onText(/^\/yangi(?:@\w+)?\s*$/, async (msg) => {
    try {
      if (!(await requireGroup(msg)) || !msg.from) return;
      await startForm(msg.chat.id, msg.from.id, msg.message_id);
    } catch (e) {
      reportError('/yangi', msg.chat.id, e);
    }
  });

  instance.onText(/^\/bekor(?:@\w+)?\s*$/, async (msg) => {
    if (!msg.from) return;
    const key = formKey(msg.chat.id, msg.from.id);
    const state = forms.get(key);
    if (!state) return;
    forms.delete(key);
    await instance.sendMessage(msg.chat.id, '❌ Forma bekor qilindi.');
    await deleteMessages(msg.chat.id, [state.promptMessageId, ...state.trash, msg.message_id]);
  });

  // Matnli javoblar. Guruhda privacy-mode yoqilgan bo'lsa bot faqat o'z savoliga reply qilingan xabarlarni ko'radi.
  instance.on('message', async (msg) => {
    try {
      if (msg.migrate_to_chat_id) {
        await migrateBotGroupChatId(String(msg.chat.id), String(msg.migrate_to_chat_id));
        return;
      }
      if (!msg.text || msg.text.startsWith('/') || !msg.from) return;
      const state = forms.get(formKey(msg.chat.id, msg.from.id));
      if (!state) return;
      await withFormLock(state, async () => {
        const step = CARGO_STEPS[state.stepIndex];
        const parsed = parseStepInput(step.kind, step.key, msg.text ?? '');
        // Noto'g'ri javob ham, xato izohi ham keyingi to'g'ri javobda o'chadi
        state.trash.push(msg.message_id);
        if (!parsed.ok) {
          const reply = await instance.sendMessage(msg.chat.id, parsed.error, { reply_to_message_id: msg.message_id });
          state.trash.push(reply.message_id);
          return;
        }
        await recordAnswer(state, parsed.value);
      });
    } catch (e) {
      reportError('message', msg.chat.id, e);
    }
  });

  instance.on('callback_query', async (query) => {
    const data = query.data;
    if (!data || !data.startsWith('cg:')) return;
    const chatId = query.message?.chat.id;
    try {
      if (chatId === undefined) {
        await instance.answerCallbackQuery(query.id);
        return;
      }
      const [, token, action, indexPart] = data.split(':');
      const state = forms.get(formKey(chatId, query.from.id));
      if (!state || state.token !== token || state.promptMessageId !== query.message?.message_id) {
        await instance.answerCallbackQuery(query.id, { text: "Bu tugma eskirgan yoki boshqa foydalanuvchining formasiga tegishli." });
        return;
      }
      await instance.answerCallbackQuery(query.id);
      await withFormLock(state, async () => {
        if (action === 'x') {
          forms.delete(formKey(chatId, query.from.id));
          await instance.editMessageText('❌ Forma bekor qilindi.', {
            chat_id: chatId,
            message_id: state.promptMessageId!,
            reply_markup: { inline_keyboard: [] },
          });
          await deleteMessages(chatId, state.trash);
          return;
        }
        if (action === 's') {
          await recordAnswer(state, null);
          return;
        }
        if (action === 'o') {
          const option = state.options[Number(indexPart)];
          if (!option) return;
          // Mahsulot/shahar/bojxona/Выгрузка — tugma matni; sotib oluvchi — shartnomadagi nom (raqamsiz)
          const value = CARGO_STEPS[state.stepIndex].key === 'buyer' ? state.contracts[option.rawIndex].buyerName : option.text;
          await recordAnswer(state, value, option);
        }
      });
    } catch (e) {
      if (chatId !== undefined) reportError('callback', chatId, e);
      else console.error('[ClientCargoBot] callback xatosi:', e instanceof Error ? e.message : e);
    }
  });
}

export const initClientCargoBot = () => {
  // Bot faqat serverda ishlashi kerak: bitta tokenni bir nechta instansiya polling qilsa Telegram 409 beradi.
  if (process.env.CLIENT_BOT_ENABLED !== 'true') {
    console.warn("[ClientCargoBot] CLIENT_BOT_ENABLED=true emas — yuk ma'lumotlari boti bu instansiyada ishga tushirilmadi (faqat serverda yoqiladi).");
    return;
  }
  const token = process.env.CLIENT_BOT_TOKEN;
  if (!token) {
    console.warn("[ClientCargoBot] CLIENT_BOT_TOKEN aniqlanmagan — yuk ma'lumotlari boti ishga tushmadi.");
    return;
  }
  if (token === process.env.FINANCE_BOT_TOKEN || token === process.env.TELEGRAM_BOT_TOKEN) {
    console.error("[ClientCargoBot] CLIENT_BOT_TOKEN boshqa bot tokeni bilan bir xil — Telegram 409 bermasligi uchun ishga tushirilmadi. Alohida bot yarating.");
    return;
  }

  bot = new TelegramBot(token, { polling: true });
  bot.on('polling_error', (error) => {
    console.error('[ClientCargoBot] Polling error:', error.message);
  });
  registerHandlers(bot);

  bot
    .setMyCommands([
      { command: 'yangi', description: "Yangi yuk ma'lumotini kiritish" },
      { command: 'bekor', description: 'Formani bekor qilish' },
      { command: 'ulash', description: 'Guruhni mijozga ulash (KOD bilan)' },
    ])
    .catch((e: unknown) => console.error('[ClientCargoBot] setMyCommands xatosi:', e instanceof Error ? e.message : e));

  // Tashlab ketilgan formalarni tozalash
  setInterval(() => {
    const cutoff = Date.now() - FORM_TTL_MS;
    for (const [key, state] of forms) {
      if (state.updatedAt < cutoff) forms.delete(key);
    }
  }, 5 * 60 * 1000).unref();

  console.log("[ClientCargoBot] Yuk ma'lumotlari boti ishga tushdi.");
};
