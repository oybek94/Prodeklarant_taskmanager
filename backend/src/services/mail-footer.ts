import fs from 'fs';
import path from 'path';

/** Xat tanasi + footer, nodemailer'ga uzatishga tayyor holda. */
export interface ComposedEmail {
  html: string;
  text: string;
  attachments: Array<{ filename: string; content: Buffer; cid: string }>;
}

// Nom logo faylining ichida bor, shuning uchun HTML footer'da matn sifatida
// takrorlanmaydi — faqat logo alt matni, plain-text nusxa va logo topilmagan
// holatdagi zaxira sifatida ishlatiladi.
const COMPANY = {
  name: 'PRODEKLARANT',
  phone: '+998 91-118-70-07',
  phoneHref: 'tel:+998911187007',
  whatsapp: 'https://wa.me/998911187007',
  telegram: 'https://t.me/oybek94',
  siteLabel: 'www.prodeklarant.uz',
  siteUrl: 'https://prodeklarant.uz',
} as const;

const LOGO_CID = 'prodeklarant-logo';
const LINK_COLOR = '#1a56db';
const MUTED_COLOR = '#4b5563';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Logoni diskdan o'qiydi. __dirname'ga nisbatan `../assets`: dist'da
 * `dist/assets`, tsx dev'da `src/assets` — ikkalasida ham to'g'ri keladi.
 * Topilmasa null — xat logosiz ketadi, lekin ketadi.
 */
function readLogo(): Buffer | null {
  const logoPath = path.join(__dirname, '..', 'assets', 'email-logo.png');
  try {
    return fs.readFileSync(logoPath);
  } catch {
    return null;
  }
}

function renderFooterHtml(hasLogo: boolean): string {
  const logoCell = hasLogo
    ? `<td style="padding-right:16px;vertical-align:top;">
         <img src="cid:${LOGO_CID}" width="195" height="40" alt="${COMPANY.name}"
              style="display:block;border:0;width:195px;height:40px;" />
       </td>`
    : '';
  // Logo bor bo'lsa nom logoda ko'rinadi; bo'lmasa matn sifatida tushadi.
  const nameFallback = hasLogo
    ? ''
    : `<div style="font-weight:bold;font-size:14px;color:#111827;letter-spacing:0.5px;">${COMPANY.name}</div>`;
  const link = (href: string, label: string) =>
    `<a href="${href}" style="color:${LINK_COLOR};text-decoration:underline;">${label}</a>`;

  return `<table cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:${MUTED_COLOR};">
  <tr>
    ${logoCell}
    <td style="vertical-align:top;">
      ${nameFallback}
      <div>Тел.: <a href="${COMPANY.phoneHref}" style="color:${MUTED_COLOR};text-decoration:none;">${COMPANY.phone}</a></div>
      <div>${link(COMPANY.whatsapp, 'Whatsapp')} | ${link(COMPANY.telegram, 'Telegram')} | ${link(COMPANY.siteUrl, COMPANY.siteLabel)}</div>
    </td>
  </tr>
</table>`;
}

function renderFooterText(): string {
  return [
    '',
    '-- ',
    COMPANY.name,
    `Тел.: ${COMPANY.phone}`,
    `Whatsapp: ${COMPANY.whatsapp}`,
    `Telegram: ${COMPANY.telegram}`,
    COMPANY.siteUrl,
  ].join('\n');
}

/**
 * Foydalanuvchi matniga footer qo'shib, HTML va plain-text nusxalarini
 * qaytaradi. Logo CID attachment sifatida beriladi (Gmail/Outlook tashqi
 * rasmlarni bloklagani uchun URL emas).
 */
export function composeEmail(bodyText: string): ComposedEmail {
  const logo = readLogo();
  const bodyHtml = escapeHtml(bodyText).replace(/\r?\n/g, '<br>');

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#111827;">
  <div style="white-space:pre-wrap;">${bodyHtml}</div>
  ${renderFooterHtml(logo !== null)}
</div>`;

  return {
    html,
    text: `${bodyText}\n${renderFooterText()}`,
    attachments: logo
      ? [{ filename: 'logo.png', content: logo, cid: LOGO_CID }]
      : [],
  };
}
