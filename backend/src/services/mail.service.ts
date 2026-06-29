import nodemailer from 'nodemailer';

// SMTP config from env. Defaults to Mail.ru (smtp.mail.ru:465, SSL) for
// backward compatibility; override SMTP_HOST/SMTP_PORT/SMTP_SECURE to use
// another relay (e.g. Brevo: smtp-relay.brevo.com:587, STARTTLS).
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.mail.ru';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;
// secure: true for SSL (465), false for STARTTLS (587/2525). Derived from the
// port unless SMTP_SECURE is set explicitly.
const SMTP_SECURE =
  process.env.SMTP_SECURE != null
    ? process.env.SMTP_SECURE === 'true'
    : SMTP_PORT === 465;

// Credentials: prefer generic SMTP_USER/SMTP_PASS, fall back to the legacy
// MAILRU_USER/MAILRU_PASSWORD so existing .env files keep working.
function getSmtpUser(): string | undefined {
  return process.env.SMTP_USER || process.env.MAILRU_USER;
}
function getSmtpPass(): string | undefined {
  return process.env.SMTP_PASS || process.env.MAILRU_PASSWORD;
}

export interface SendMailOptions {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
}

/**
 * Validates that SMTP credentials are set. Call before send.
 * @throws Error if the SMTP user or password is missing
 */
export function requireSmtpConfig(): void {
  if (!getSmtpUser() || !getSmtpPass()) {
    throw new Error(
      'SMTP is not configured. Set SMTP_USER and SMTP_PASS in .env'
    );
  }
}

/** Build a nodemailer transport from the current env config. Asserts creds. */
function createSmtpTransport() {
  requireSmtpConfig();
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: getSmtpUser()!, pass: getSmtpPass()! },
  });
}

/**
 * Verify SMTP host/port and credentials without sending. Useful for setup
 * checks (e.g. scripts/test-smtp.ts). Resolves true or rejects on failure.
 */
export async function verifySmtp(): Promise<boolean> {
  return createSmtpTransport().verify();
}

/**
 * Send email via SMTP. Host/port/security from process.env
 * (SMTP_HOST, SMTP_PORT, SMTP_SECURE); credentials from SMTP_USER/SMTP_PASS
 * (or legacy MAILRU_USER/MAILRU_PASSWORD); sender from MAIL_FROM.
 */
export async function sendMail(options: SendMailOptions): Promise<void> {
  const from = process.env.MAIL_FROM || getSmtpUser()!;
  const transporter = createSmtpTransport();

  const mailOptions: nodemailer.SendMailOptions = {
    from,
    to: options.to.join(', '),
    subject: options.subject,
    text: options.text,
    html: options.html,
    attachments: options.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  };
  if (options.cc?.length) mailOptions.cc = options.cc.join(', ');
  if (options.bcc?.length) mailOptions.bcc = options.bcc.join(', ');

  await transporter.sendMail(mailOptions);
}
