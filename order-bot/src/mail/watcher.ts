import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import type { ImapConfig } from '../config.js';
import { log } from '../logger.js';

export type IncomingMail = {
  messageId: string;
  subject: string;
  from: string;
  date: Date;
  html: string;
};

type Handler = (mail: IncomingMail) => Promise<void>;

const RECONNECT_MIN_MS = 1000;
const RECONNECT_MAX_MS = 60_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Gmail'ga IMAP IDLE bilan ulanib turadi va yangi xat kelganda `onMail` chaqiradi.
 * Ulanish uzilsa eksponensial backoff bilan qayta ulanadi va hech qachon to'xtamaydi.
 */
export const watchMailbox = async (
  config: ImapConfig,
  onMail: Handler,
): Promise<never> => {
  let backoff = RECONNECT_MIN_MS;

  for (;;) {
    try {
      await runSession(config, onMail, () => {
        backoff = RECONNECT_MIN_MS; // muvaffaqiyatli ulanish — backoff tiklanadi
      });
    } catch (error) {
      log.error('IMAP sessiyasi uzildi:', error instanceof Error ? error.message : error);
    }

    log.info(`${Math.round(backoff / 1000)} soniyadan keyin qayta ulanish...`);
    await sleep(backoff);
    backoff = Math.min(backoff * 2, RECONNECT_MAX_MS);
  }
};

const runSession = async (
  config: ImapConfig,
  onMail: Handler,
  onConnected: () => void,
): Promise<void> => {
  const client = new ImapFlow({
    host: config.IMAP_HOST,
    port: config.IMAP_PORT,
    secure: true,
    auth: { user: config.IMAP_USER, pass: config.IMAP_PASSWORD },
    logger: false,
  });

  let lastUid = 0;
  let processing = false;
  let pending = false;

  /**
   * `lastUid` dan keyingi xatlarni o'qiydi.
   * Bir vaqtda bitta o'qish ishlaydi; ustidan kelgan signal `pending` ga yoziladi.
   */
  const processNew = async (): Promise<void> => {
    if (processing) {
      pending = true;
      return;
    }
    processing = true;

    try {
      do {
        pending = false;
        const lock = await client.getMailboxLock(config.IMAP_MAILBOX);
        try {
          // Diqqat: IMAP da `UID FETCH n:*` yangi xat bo'lmasa ham oxirgi xatni
          // qaytaradi — shu sababli quyida uid qayta tekshiriladi.
          for await (const message of client.fetch(
            { uid: `${lastUid + 1}:*` },
            { uid: true, source: true },
          )) {
            if (message.uid <= lastUid) continue;
            lastUid = message.uid;

            if (!message.source) continue;
            const mail = await toIncomingMail(message.source);
            if (mail) await onMail(mail);
          }
        } finally {
          lock.release();
        }
      } while (pending);
    } finally {
      processing = false;
    }
  };

  client.on('error', (error: unknown) => {
    log.warn('IMAP xatosi:', error instanceof Error ? error.message : error);
  });

  await client.connect();
  log.info(`Pochtaga ulandi: ${config.IMAP_USER} (${config.IMAP_MAILBOX})`);
  onConnected();

  await client.mailboxOpen(config.IMAP_MAILBOX);
  lastUid = await resolveStartUid(client, config);
  log.info(`Kuzatuv boshlandi, UID > ${lastUid}`);

  // Ishga tushganda darhol bir marta tekshiramiz (lookback yoki uzilish paytidagi xatlar).
  await processNew();

  client.on('exists', () => {
    void processNew().catch((error) => log.error('Yangi xatni o\'qishda xato:', error));
  });

  // IDLE jim qolgan holatlar uchun zaxira tekshiruv.
  const timer = setInterval(
    () => {
      void processNew().catch((error) => log.error('Zaxira tekshiruvda xato:', error));
    },
    config.POLL_FALLBACK_MINUTES * 60_000,
  );

  try {
    // Ulanish uzilguncha kutamiz.
    await new Promise<void>((_, reject) => {
      client.once('close', () => reject(new Error('IMAP ulanishi yopildi')));
      client.once('error', (error: unknown) =>
        reject(error instanceof Error ? error : new Error(String(error))),
      );
    });
  } finally {
    clearInterval(timer);
    await client.logout().catch(() => undefined);
  }
};

/**
 * Qayerdan boshlab o'qishni aniqlaydi.
 * Standart holatda faqat yangi xatlar; INITIAL_LOOKBACK_DAYS berilsa o'sha
 * kunlardagi xatlar ham qayta ishlanadi.
 */
const resolveStartUid = async (client: ImapFlow, config: ImapConfig): Promise<number> => {
  const status = await client.status(config.IMAP_MAILBOX, { uidNext: true });
  const nextUid = status.uidNext ?? 1;

  if (config.INITIAL_LOOKBACK_DAYS <= 0) return nextUid - 1;

  const since = new Date();
  since.setDate(since.getDate() - config.INITIAL_LOOKBACK_DAYS);

  const found = await client.search({ since }, { uid: true });
  const uids = Array.isArray(found) ? found : [];
  if (uids.length === 0) return nextUid - 1;

  log.info(`Oxirgi ${config.INITIAL_LOOKBACK_DAYS} kunlik ${uids.length} ta xat ko'riladi`);
  return Math.min(...uids) - 1;
};

/**
 * Oxirgi N kundagi xatlarni bir marta o'qib beradi (kuzatmasdan).
 * `check-mail` va `dump-fixture` skriptlari uchun.
 */
export const fetchRecentMails = async (
  config: ImapConfig,
  days: number,
): Promise<IncomingMail[]> => {
  const client = new ImapFlow({
    host: config.IMAP_HOST,
    port: config.IMAP_PORT,
    secure: true,
    auth: { user: config.IMAP_USER, pass: config.IMAP_PASSWORD },
    logger: false,
  });

  await client.connect();
  const mails: IncomingMail[] = [];

  const lock = await client.getMailboxLock(config.IMAP_MAILBOX);
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);

    for await (const message of client.fetch({ since }, { uid: true, source: true })) {
      if (!message.source) continue;
      const mail = await toIncomingMail(message.source);
      if (mail) mails.push(mail);
    }
  } finally {
    lock.release();
    await client.logout().catch(() => undefined);
  }

  return mails;
};

const toIncomingMail = async (source: Buffer): Promise<IncomingMail | null> => {
  try {
    const parsed = await simpleParser(source);
    const html =
      typeof parsed.html === 'string' ? parsed.html : (parsed.textAsHtml ?? '');

    return {
      messageId: parsed.messageId ?? `no-id-${parsed.date?.getTime() ?? Date.now()}`,
      subject: parsed.subject ?? '(mavzusiz)',
      from: parsed.from?.text ?? '(noma\'lum)',
      date: parsed.date ?? new Date(),
      html,
    };
  } catch (error) {
    log.error('Xatni parse qilib bo\'lmadi:', error);
    return null;
  }
};
