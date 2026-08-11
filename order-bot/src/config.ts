import 'dotenv/config';
import { z } from 'zod';

const imapSchema = z.object({
  IMAP_HOST: z.string().min(1).default('imap.gmail.com'),
  IMAP_PORT: z.coerce.number().int().positive().default(993),
  IMAP_USER: z.string().min(1, 'IMAP_USER kerak'),
  IMAP_PASSWORD: z.string().min(1, 'IMAP_PASSWORD kerak (Gmail App Password)'),
  IMAP_MAILBOX: z.string().min(1).default('INBOX'),
  POLL_FALLBACK_MINUTES: z.coerce.number().int().positive().default(5),
  INITIAL_LOOKBACK_DAYS: z.coerce.number().int().min(0).default(0),
});

const telegramSchema = z.object({
  ORDER_BOT_TOKEN: z.string().min(1, 'ORDER_BOT_TOKEN kerak (@BotFather)'),
  ORDER_BOT_CHAT_ID: z.string().min(1, 'ORDER_BOT_CHAT_ID kerak (npm run chat-id)'),
});

export type ImapConfig = z.infer<typeof imapSchema>;
export type TelegramConfig = z.infer<typeof telegramSchema>;
export type Config = ImapConfig & TelegramConfig;

const parse = <T extends z.ZodTypeAny>(schema: T): z.infer<T> => {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`.env sozlamalari to'liq emas:\n${issues}`);
  }
  return parsed.data;
};

/** Faqat pochta kerak bo'lgan skriptlar uchun (dump-fixture, check-mail). */
export const loadImapConfig = (): ImapConfig => parse(imapSchema);

/** Faqat Telegram kerak bo'lgan skriptlar uchun (chat-id). */
export const loadTelegramConfig = (): TelegramConfig => parse(telegramSchema);

/** Botning o'zi uchun — hammasi shart. */
export const loadConfig = (): Config => ({
  ...loadImapConfig(),
  ...loadTelegramConfig(),
});

export const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`.env da ${name} yo'q`);
  return value;
};
