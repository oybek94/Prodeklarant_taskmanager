import nodemailer from 'nodemailer';

const MAILRU_HOST = 'smtp.mail.ru';
const MAILRU_PORT = 465;

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
 * Validates that Mail.ru SMTP env vars are set. Call before send.
 * @throws Error if MAILRU_USER or MAILRU_PASSWORD is missing
 */
export function requireMailRuConfig(): void {
  const user = process.env.MAILRU_USER;
  const pass = process.env.MAILRU_PASSWORD;
  if (!user || !pass) {
    throw new Error(
      'SMTP is not configured. Set MAILRU_USER and MAILRU_PASSWORD in .env'
    );
  }
}

/**
 * Send email via Mail.ru SMTP (SSL, port 465).
 * Credentials from process.env: MAILRU_USER, MAILRU_PASSWORD; optional MAIL_FROM.
 */
export async function sendMail(options: SendMailOptions): Promise<void> {
  requireMailRuConfig();

  const user = process.env.MAILRU_USER!;
  const pass = process.env.MAILRU_PASSWORD!;
  const from = process.env.MAIL_FROM || user;

  const transporter = nodemailer.createTransport({
    host: MAILRU_HOST,
    port: MAILRU_PORT,
    secure: true,
    auth: { user, pass },
  });

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
