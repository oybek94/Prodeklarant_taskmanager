import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../prisma';
import { renderInvoicePdf } from './invoice-pdf-render';
import { callTelegram, sendTelegramDocument } from './telegram-bot-api';

// Mijoz guruhiga tekshirish uchun invoys PDF'ini yuborish (faqat ko'rish: tuzatish dasturda qilinadi).
// Har chaqiruvda bazadagi joriy invoys chiziladi — xodim tuzatgach yangi nusxa chiqadi.

const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads');
const IMAGE_TYPES: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

export interface CargoInvoicePdfParams {
  botToken: string;
  clientId: number;
  chatId: string;
  taskId: number;
  /** Guruhdagi ariza xabari — hujjat unga javob bo'lib keladi */
  replyToMessageId?: number | null;
  /** Avtomatik yuborishda: xato bo'lsa guruhga qayta urinish yo'lini yozish */
  notifyOnFailure?: boolean;
}

export type CargoInvoicePdfResult = { ok: true } | { ok: false; error: string };

const FAILED = "Invoys PDF'ini tayyorlab bo'lmadi. Birozdan keyin «📄 Invoysni ko'rish» tugmasini bosing.";
const NOT_FOUND = 'Invoys topilmadi.';

/** "12_26 АВТО 40232BAA.pdf" — dasturdan yuklab olingandagidek */
export function cargoInvoiceFileName(invoiceNumber: string, vehicleNumber: string | undefined): string {
  const plate = vehicleNumber?.split(/[/_+,]/)[0].trim();
  const name = plate ? `${invoiceNumber} АВТО ${plate}` : invoiceNumber;
  return `${name.replace(/[\\/:*?"<>|]+/g, '_').trim()}.pdf`;
}

/** Logotipni data: URI qiladi: chizuvchi jarayon server fayllarini o'zi qidirmaydi */
async function logoDataUri(url: string | null): Promise<string | null> {
  if (!url?.startsWith('/uploads/')) return null;
  const file = path.resolve(UPLOADS_ROOT, url.slice('/uploads/'.length));
  const type = IMAGE_TYPES[path.extname(file).toLowerCase()];
  if (!type || !file.startsWith(UPLOADS_ROOT + path.sep)) return null;
  try {
    return `data:${type};base64,${(await readFile(file)).toString('base64')}`;
  } catch {
    return null;
  }
}

/** Invoys, shartnoma va vazifa — dasturdagi invoys sahifasi oladigan ma'lumot. Invoys shu mijozniki bo'lishi shart. */
async function loadSource(taskId: number, clientId: number) {
  const invoice = await prisma.invoice.findFirst({
    where: { taskId, clientId },
    include: { items: { orderBy: { orderIndex: 'asc' } } },
  });
  if (!invoice) return null;

  const [contract, task] = await Promise.all([
    invoice.contractId ? prisma.contract.findUnique({ where: { id: invoice.contractId } }) : null,
    prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        client: {
          select: { id: true, name: true, address: true, inn: true, phone: true, email: true, bankName: true, bankAddress: true, bankAccount: true, bankSwift: true },
        },
        branch: { select: { id: true, name: true, defaultRegionCode: true } },
      },
    }),
  ]);

  // Tekshiruv nusxasi pechat va imzosiz: rasm manzillari chizuvchiga umuman berilmaydi
  const printable = contract
    ? {
        ...contract,
        signatureUrl: undefined,
        sealUrl: undefined,
        sellerSignatureUrl: undefined,
        sellerSealUrl: undefined,
        buyerSignatureUrl: undefined,
        buyerSealUrl: undefined,
        consigneeSignatureUrl: undefined,
        consigneeSealUrl: undefined,
        companyLogoUrl: await logoDataUri(contract.companyLogoUrl),
      }
    : null;

  // Prisma Decimal/Date → API javobidagi kabi matn
  const source: unknown = JSON.parse(JSON.stringify({ invoice, contract: printable, task }));
  return { source, invoice };
}

async function deliver(params: CargoInvoicePdfParams): Promise<CargoInvoicePdfResult> {
  const { botToken, clientId, chatId, taskId, replyToMessageId } = params;
  const loaded = await loadSource(taskId, clientId);
  if (!loaded) return { ok: false, error: NOT_FOUND };

  const { invoice, source } = loaded;
  const additionalInfo = invoice.additionalInfo;
  const vehicle =
    additionalInfo && typeof additionalInfo === 'object' && !Array.isArray(additionalInfo) ? additionalInfo.vehicleNumber : undefined;

  const sent = await sendTelegramDocument(botToken, {
    chatId,
    file: await renderInvoicePdf(source),
    filename: cargoInvoiceFileName(invoice.invoiceNumber, typeof vehicle === 'string' ? vehicle : undefined),
    caption: `🧾 Инвойс № ${invoice.invoiceNumber}\nTekshirib chiqing, xato bo'lsa shu guruhga yozing. Pechat va imzosiz nusxa.`,
    replyToMessageId: replyToMessageId ?? undefined,
  });
  if (!sent.ok) {
    console.error('[ClientCargoInvoicePdf] Yuborib bo\'lmadi:', sent.description);
    return { ok: false, error: FAILED };
  }
  return { ok: true };
}

/** Bir invoys bir vaqtda bir marta yuboriladi (tugma ketma-ket bosilsa takrorlanmaydi) */
const inFlight = new Map<string, Promise<CargoInvoicePdfResult>>();

async function sendOnce(params: CargoInvoicePdfParams): Promise<CargoInvoicePdfResult> {
  let result: CargoInvoicePdfResult;
  try {
    result = await deliver(params);
  } catch (e) {
    console.error('[ClientCargoInvoicePdf] Xato:', e instanceof Error ? e.message : e);
    result = { ok: false, error: FAILED };
  }
  if (!result.ok && params.notifyOnFailure) {
    await callTelegram<unknown>(params.botToken, 'sendMessage', { chat_id: params.chatId, text: result.error });
  }
  return result;
}

/** Xato otmaydi — natija sifatida qaytaradi */
export function sendCargoInvoicePdf(params: CargoInvoicePdfParams): Promise<CargoInvoicePdfResult> {
  const key = `${params.chatId}:${params.taskId}`;
  const running = inFlight.get(key);
  if (running) return running;
  const next = sendOnce(params).finally(() => inFlight.delete(key));
  inFlight.set(key, next);
  return next;
}
