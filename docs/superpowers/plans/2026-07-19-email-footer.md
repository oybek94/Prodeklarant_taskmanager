# Email Footer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Har bir chiquvchi xatga logo va kontaktlar turgan ruscha HTML footer avtomatik qo'shilsin.

**Architecture:** Yangi sof modul `mail-footer.ts` bitta funksiya beradi — `composeEmail(bodyText)` → `{ html, text, attachments }`. `mail.service.ts` dagi `sendMail()` uni chaqiradi va natijani nodemailer'ga uzatadi; footer mantiqi transport kodidan butunlay ajratilgan. Logo build vaqtida `dist/assets` ga ko'chiriladigan PNG, xatga CID inline attachment sifatida biriktiriladi.

**Tech Stack:** TypeScript (CommonJS, ES2020), nodemailer, vitest.

## Global Constraints

- TypeScript strict, `any` ishlatilmaydi (CLAUDE.md)
- Modul tizimi CommonJS — `__dirname` mavjud, ESM `import.meta` ISHLATILMAYDI
- Footer tili **ruscha**, spec'dagi matn aynan ko'chiriladi
- Logo formati **PNG** (email mijozlari SVG'ni ko'rsatmaydi)
- Maket `<table>` + inline CSS (Outlook `<div>`/flexbox maketlarini buzadi)
- Logo o'qilmasa xat baribir yuboriladi — footer logosiz chiqadi
- Logo faylida korxona nomi va shior allaqachon bor — HTML footer'da ular
  matn sifatida TAKRORLANMAYDI. Plain-text nusxada logo yo'q, u yerda nom qoladi.
- Kontakt qiymatlari (spec'dan, aynan):
  - Nom: `PRODEKLARANT` (faqat logo `alt` matni va plain-text nusxa uchun)
  - Telefon: `+998 91-118-70-07` (href: `tel:+998911187007`)
  - Whatsapp: `https://wa.me/998911187007`
  - Telegram: `https://t.me/oybek94`
  - Sayt: `https://prodeklarant.uz` (matni: `www.prodeklarant.uz`)

## File Structure

| Fayl | Mas'uliyat |
|---|---|
| `backend/src/assets/email-logo.png` (yangi) | Footer logosi, 390x80px PNG |
| `backend/src/scripts/copy-assets.js` (yangi) | Build'da `src/assets` → `dist/assets` ko'chiradi |
| `backend/package.json` (tahrir) | `build` skriptiga `copy-assets` qadami |
| `backend/src/services/mail-footer.ts` (yangi) | Footer HTML/text yasash, logo o'qish — butun ko'rinish mantiqi shu yerda |
| `backend/src/__tests__/mail-footer.test.ts` (yangi) | `composeEmail()` testlari |
| `backend/src/services/mail.service.ts` (tahrir) | `sendMail()` `composeEmail()` ni chaqiradi |

---

### Task 1: Logo assetini tayyorlash va build'ga ulash

**Files:**
- Create: `backend/src/assets/email-logo.png`
- Create: `backend/src/scripts/copy-assets.js`
- Modify: `backend/package.json` (`scripts.build`)

**Interfaces:**
- Consumes: hech nima
- Produces: `backend/src/assets/email-logo.png` fayli (Task 2 uni o'qiydi), va build'dan keyin `backend/dist/assets/email-logo.png`

- [ ] **Step 1: Logoni kichraytirib PNG yasash**

Manba `frontend/public/logo.png` — 2028x416 px, 31KB. Ekranda 40px balandlikda ko'rsatiladi, retina displeylar uchun 2x — 390x80 px.

PowerShell'da (Windows, qo'shimcha kutubxonasiz):

```powershell
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force "G:\Prodeklarant\backend\src\assets" | Out-Null
$src = [System.Drawing.Image]::FromFile("G:\Prodeklarant\frontend\public\logo.png")
$bmp = New-Object System.Drawing.Bitmap 390, 80
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.Clear([System.Drawing.Color]::Transparent)
$g.DrawImage($src, 0, 0, 390, 80)
$bmp.Save("G:\Prodeklarant\backend\src\assets\email-logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose(); $src.Dispose()
```

- [ ] **Step 2: Fayl yaratilganini va hajmini tekshirish**

Run: `ls -l backend/src/assets/email-logo.png`
Expected: fayl mavjud, hajmi 30KB dan kichik. Faylni ochib logo o'qilishini ko'z bilan tasdiqlang (fon shaffof, qirqilmagan).

- [ ] **Step 3: copy-assets.js yozish**

`backend/src/scripts/copy-assets.js` — `copy-fonts.js` bilan bir xil uslubda:

```js
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'assets');
const destDir = path.join(__dirname, '..', '..', 'dist', 'assets');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

if (fs.existsSync(srcDir)) {
  const files = fs.readdirSync(srcDir);
  for (const file of files) {
    try {
      fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
      console.log(`Copied ${file} to dist/assets/`);
    } catch (err) {
      console.error(`Error copying ${file}:`, err.message);
    }
  }
} else {
  console.log('No assets directory found in src/, skipping copy.');
}
```

- [ ] **Step 4: build skriptiga ulash**

`backend/package.json` da `build` qatorini o'zgartiring:

```json
"build": "npx prisma generate && tsc && node src/scripts/copy-fonts.js && node src/scripts/copy-assets.js",
```

- [ ] **Step 5: Ko'chirishni tekshirish**

Run: `cd backend && node src/scripts/copy-assets.js && ls -l dist/assets/`
Expected: `Copied email-logo.png to dist/assets/` va fayl ro'yxatda ko'rinadi.

- [ ] **Step 6: Commit**

```bash
git add backend/src/assets/email-logo.png backend/src/scripts/copy-assets.js backend/package.json
git commit -m "feat(mail): email footer logosi + build'da assets ko'chirish"
```

---

### Task 2: composeEmail() moduli

**Files:**
- Create: `backend/src/services/mail-footer.ts`
- Test: `backend/src/__tests__/mail-footer.test.ts`

**Interfaces:**
- Consumes: `backend/src/assets/email-logo.png` (Task 1)
- Produces:
  ```ts
  export interface ComposedEmail {
    html: string;
    text: string;
    attachments: Array<{ filename: string; content: Buffer; cid: string }>;
  }
  export function composeEmail(bodyText: string): ComposedEmail;
  ```
  Task 3 aynan shu nom va tiplarga tayanadi.

- [ ] **Step 1: Failing testni yozish**

`backend/src/__tests__/mail-footer.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import { composeEmail } from '../services/mail-footer';

describe('composeEmail', () => {
  it('HTML ichida kontaktlar bo\'ladi', () => {
    const { html } = composeEmail('Salom');
    expect(html).toContain('+998 91-118-70-07');
    expect(html).toContain('https://wa.me/998911187007');
    expect(html).toContain('https://t.me/oybek94');
    expect(html).toContain('https://prodeklarant.uz');
  });

  it('logo takrorlagan nom va shiorni HTML matnida qaytarmaydi', () => {
    const { html } = composeEmail('Salom');
    expect(html).not.toContain('Ваш надежный представитель на таможне.');
    // "PRODEKLARANT" faqat logo alt matnida bo'lishi mumkin, ko'rinadigan
    // matn sifatida emas.
    expect(html).not.toMatch(/>\s*PRODEKLARANT\s*</);
  });

  it('foydalanuvchi matnini HTML\'ga qochiradi', () => {
    const { html } = composeEmail('5 < 10 & "narx"');
    expect(html).toContain('5 &lt; 10 &amp; &quot;narx&quot;');
    expect(html).not.toContain('5 < 10 &');
  });

  it('qator uzilishlarini <br> ga aylantiradi', () => {
    const { html } = composeEmail('birinchi\nikkinchi');
    expect(html).toContain('birinchi<br>ikkinchi');
  });

  it('plain-text nusxasida HTML teglari yo\'q, kontaktlar bor', () => {
    const { text } = composeEmail('Salom');
    expect(text).toContain('Salom');
    expect(text).toContain('+998 91-118-70-07');
    expect(text).toContain('https://prodeklarant.uz');
    expect(text).not.toMatch(/<[a-z]/i);
  });

  it('logo mavjud bo\'lsa CID attachment qaytaradi', () => {
    const { attachments, html } = composeEmail('Salom');
    expect(attachments).toHaveLength(1);
    expect(attachments[0].cid).toBe('prodeklarant-logo');
    expect(attachments[0].content.length).toBeGreaterThan(0);
    expect(html).toContain('cid:prodeklarant-logo');
  });

  it('logo topilmasa ham xat yasaladi, attachments bo\'sh bo\'ladi', () => {
    const spy = vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('ENOENT');
    });
    try {
      const { html, attachments } = composeEmail('Salom');
      expect(attachments).toHaveLength(0);
      expect(html).toContain('PRODEKLARANT');
      expect(html).not.toContain('cid:prodeklarant-logo');
    } finally {
      spy.mockRestore();
    }
  });

  it('bo\'sh matn bilan ham ishlaydi', () => {
    const { html, text } = composeEmail('');
    expect(html).toContain('PRODEKLARANT');
    expect(text).toContain('PRODEKLARANT');
  });
});
```

- [ ] **Step 2: Testni ishga tushirib, yiqilishini tasdiqlash**

Run: `cd backend && npx vitest run src/__tests__/mail-footer.test.ts`
Expected: FAIL — `Failed to resolve import "../services/mail-footer"`

- [ ] **Step 3: Modulni yozish**

`backend/src/services/mail-footer.ts`:

```ts
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
 * Logoni diskdan o'qiydi. dist'da `dist/assets`, tsx dev'da `src/assets`
 * (ikkalasida ham __dirname'ga nisbatan `../assets`). Topilmasa null —
 * xat logosiz ketadi, lekin ketadi.
 */
function readLogo(): Buffer | null {
  const candidates = [
    path.join(__dirname, '..', 'assets', 'email-logo.png'),
    path.join(process.cwd(), 'src', 'assets', 'email-logo.png'),
  ];
  for (const candidate of candidates) {
    try {
      return fs.readFileSync(candidate);
    } catch {
      continue;
    }
  }
  return null;
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
    '--',
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
  <div>${bodyHtml}</div>
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
```

- [ ] **Step 4: Testlarni ishga tushirish**

Run: `cd backend && npx vitest run src/__tests__/mail-footer.test.ts`
Expected: PASS — 8 test.

- [ ] **Step 5: Tip tekshiruvi**

Run: `cd backend && npx tsc --noEmit`
Expected: chiqishsiz (xatosiz).

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/mail-footer.ts backend/src/__tests__/mail-footer.test.ts
git commit -m "feat(mail): composeEmail() — footer HTML + plain-text + CID logo"
```

---

### Task 3: sendMail() ga ulash

**Files:**
- Modify: `backend/src/services/mail.service.ts` (`SendMailOptions.attachments` tipi va `sendMail()` tanasi)

**Interfaces:**
- Consumes: `composeEmail(bodyText): ComposedEmail` (Task 2)
- Produces: o'zgargan `sendMail()` — chaqiruvchilar uchun API o'zgarmaydi

- [ ] **Step 1: attachments tipiga ixtiyoriy cid qo'shish**

`mail.service.ts:31` da `SendMailOptions` ichidagi qatorni almashtiring:

```ts
  attachments?: Array<{ filename: string; content: Buffer; cid?: string }>;
```

- [ ] **Step 2: composeEmail importini qo'shish**

`mail.service.ts` boshiga, `nodemailer` importidan keyin:

```ts
import { composeEmail } from './mail-footer';
```

- [ ] **Step 3: sendMail() tanasini o'zgartirish**

`sendMail()` ichidagi `mailOptions` bloki hozir shunday:

```ts
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
```

Uni shunga almashtiring:

```ts
  // Footer har bir xatga qo'shiladi. Chaqiruvchi tayyor html bergan bo'lsa
  // (hozir hech kim bermaydi) unga tegilmaydi.
  const composed = options.html ? null : composeEmail(options.text ?? '');
  const bodyAttachments = (options.attachments ?? []).map((a) => ({
    filename: a.filename,
    content: a.content,
    ...(a.cid ? { cid: a.cid } : {}),
  }));
  const allAttachments = [...bodyAttachments, ...(composed?.attachments ?? [])];

  const mailOptions: nodemailer.SendMailOptions = {
    from,
    to: options.to.join(', '),
    subject: options.subject,
    text: composed ? composed.text : options.text,
    html: composed ? composed.html : options.html,
    attachments: allAttachments.length ? allAttachments : undefined,
  };
```

- [ ] **Step 4: Tip tekshiruvi va butun test to'plami**

Run: `cd backend && npx tsc --noEmit && npx vitest run`
Expected: tsc chiqishsiz; vitest — barcha testlar o'tadi.

- [ ] **Step 5: Haqiqiy xat yuborib tekshirish**

Run: `cd backend && npx tsx src/scripts/test-smtp.ts --send oybek4536@gmail.com`
Expected: `✅ Xat yuborildi.`

Keyin Gmail'da **ko'z bilan** tasdiqlang:
- Footer ko'rinadi, logo yuklanadi (tashqi rasm ogohlantirishisiz)
- Uchala link bosilganda to'g'ri manzilga o'tadi
- Xat spam'ga tushmagan

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/mail.service.ts
git commit -m "feat(mail): footer har bir xatga avtomatik qo'shiladi"
```

---

## Deploy

Bu reja kodni o'zgartiradi, lekin serverda qo'shimcha ikki qadam kerak:

1. `/var/www/app/backend/.env` ga `MAIL_FROM_NAME=Prodeklarant | Team` qo'shish (From nomi o'zgarishi — alohida, hali chiqmagan)
2. `git pull && npm run build && pm2 restart prodeklarant-backend`

`npm run build` endi `copy-assets.js` ni ham chaqiradi — logo `dist/assets` ga tushadi. Agar tushmasa footer logosiz ketadi (xato bermaydi), shuning uchun deploy'dan keyin serverda `ls dist/assets/` bilan tekshiring.
