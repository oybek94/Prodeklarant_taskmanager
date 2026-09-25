import apiClient from '../../lib/api';
import { getClientCurrency, formatMoney } from './taskHelpers';
import type { TaskDetail, Branch } from './types';

// ==================================================================
// Phone helper
// ==================================================================

/** Telefon raqamidan bo'shliqlarni olib tashlash, + belgisini saqlash */
export const cleanPhoneNumber = (phone: string): string =>
  phone.replace(/\s+/g, '');

// ==================================================================
// Telegram
// ==================================================================

/** Telegram xabar matnini yaratish — branch ma'lumotlari API dan keladi */
export const generateTelegramMessage = (task: TaskDetail, branches: Branch[]): string => {
  const taskName = task.title;
  const branchName = task.branch.name;
  const baseUrl =
    import.meta.env.VITE_PUBLIC_BASE_URL ||
    import.meta.env.VITE_FRONTEND_URL ||
    window.location.origin;
  const documentsUrl = task.qrToken ? `${baseUrl}/q/${task.qrToken}` : null;

  // API dan kelgan branch metadata
  const branch = branches.find((b) => b.name === branchName);
  const phones = branch?.phones || [];
  const address = branch?.address || '';
  const phoneLines = phones.map((phone) => `📞 Tel: ${phone}`).join('\n');

  return `📄 *HUJJATINGIZ TAYYOR* ✅\n━━━━━━━━━━━━━━━━━━\n🆔 *Hujjat raqami:*\n${taskName}\n\n${phoneLines}\n📌 Xarita: ${address}\n\n📎 *Elektron hujjatlar*\n👇 Yuklab olish / ko'rish:\n🔗 ${documentsUrl || ''}\n\n🤝 Savollaringiz bo'lsa — bemalol murojaat qiling!`;
};

/** Telegram linkni ochish (QR token kerak bo'lsa avval generatsiya) */
export const handleTelegramClick = async (
  selectedTask: TaskDetail,
  setSelectedTask: (task: TaskDetail) => void,
  branches: Branch[],
) => {
  if (!selectedTask.driverPhone) return;

  const cleanedPhone = cleanPhoneNumber(selectedTask.driverPhone);
  let taskForMessage = selectedTask;

  if (!selectedTask.qrToken) {
    try {
      await apiClient.get(`/sticker/${selectedTask.id}/image`, { responseType: 'blob' });
    } catch { /* ignore */ }
    try {
      const response = await apiClient.get(`/tasks/${selectedTask.id}`);
      taskForMessage = response.data;
      setSelectedTask(response.data);
    } catch { /* fallback to existing data */ }
  }

  const message = generateTelegramMessage(taskForMessage, branches);
  const encodedMessage = encodeURIComponent(message);
  const phoneWithPlus = cleanedPhone.startsWith('+') ? cleanedPhone : `+${cleanedPhone}`;
  const telegramUrl = `https://t.me/${phoneWithPlus}?text=${encodedMessage}`;

  window.open(telegramUrl, '_blank');
};

// ==================================================================
// Invoice Extracted Text Formatting
// ==================================================================

/** Invoice OCR matnini formatlash — jadval qatorlarini odam o'qiy oladigan shaklga keltirish */
export const formatInvoiceExtractedText = (text: string, documentType?: string): string => {
  if (!text || !documentType || documentType !== 'INVOICE') return text;

  const lines = text.split('\n');
  const formattedLines: string[] = [];
  let inProductTable = false;
  let headerLineIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lowerLine = line.toLowerCase();

    if (lowerLine.includes('№') &&
      (lowerLine.includes('код тн вэд') || lowerLine.includes('наименование товара'))) {
      inProductTable = true;
      headerLineIndex = i;
      continue;
    }

    if (inProductTable && /^\d+\s/.test(line)) {
      let parts: string[] = [];
      if (line.includes('|')) {
        parts = line.split('|').map(p => p.trim()).filter(p => p.length > 0);
        if (parts.length > 0 && parts[0] === '') parts.shift();
        if (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
      } else {
        parts = line.split(/\s{2,}|\t/).filter(p => p.trim().length > 0);
      }

      if (parts.length >= 6) {
        const formattedProduct: string[] = [];
        if (parts[0] && /^\d+$/.test(parts[0].trim())) {
          formattedProduct.push(`№: ${parts[0].trim()}`);
        }

        let tnvedIndex = -1;
        let nameIndex = -1;
        let packagingIndex = -1;

        for (let j = 1; j < parts.length; j++) {
          const part = parts[j].trim();
          if (/^\d{4,10}$/.test(part.replace(/\s/g, '')) && tnvedIndex === -1) {
            tnvedIndex = j;
            formattedProduct.push(`Код ТН ВЭД: ${part}`);
          } else if (tnvedIndex !== -1 && nameIndex === -1 && !/^\d/.test(part)) {
            nameIndex = j;
            formattedProduct.push(`Наименование: ${part}`);
          } else if (nameIndex !== -1 && packagingIndex === -1 && !/^\d/.test(part)) {
            packagingIndex = j;
            formattedProduct.push(`Упаковка: ${part}`);
            break;
          }
        }

        if (packagingIndex === -1 && nameIndex !== -1) {
          packagingIndex = nameIndex + 1;
        }
        if (packagingIndex === -1) {
          packagingIndex = Math.min(4, parts.length - 1);
        }

        const numbers: string[] = [];
        for (let j = packagingIndex; j < parts.length; j++) {
          const part = parts[j].trim();
          const cleanedPart = part.replace(/\s/g, '');
          if (/^\d+$/.test(cleanedPart) ||
            /^\d+[.,]\d+$/.test(cleanedPart) ||
            /^\d{1,3}(\s?\d{3})*([.,]\d+)?$/.test(part.trim())) {
            numbers.push(part.trim());
          }
        }

        if (numbers.length >= 3) {
          formattedProduct.push(`Мест: ${numbers[0]}`);
          formattedProduct.push(`Брутто: ${numbers[1]}`);
          formattedProduct.push(`Нетто: ${numbers[2]}`);
        }
        if (numbers.length >= 4) {
          formattedProduct.push(`Общая сумма: ${numbers[numbers.length - 1]}`);
        }

        formattedLines.push(...formattedProduct);
        formattedLines.push('');
        continue;
      }
    }

    if (inProductTable) {
      if (lowerLine.includes('итого:') || lowerLine.includes('всего:')) {
        inProductTable = false;
        formattedLines.push(line);
        continue;
      }
      if ((line.trim().length === 0 && i > headerLineIndex + 5) ||
        (/^[А-ЯЁ]/.test(line) && !lowerLine.includes('№'))) {
        inProductTable = false;
      }
    }

    if (!inProductTable) {
      formattedLines.push(lines[i]);
    }
  }

  return formattedLines.join('\n');
};

// ==================================================================
// Financial Display Helpers
// ==================================================================

const AFTER_HOURS_EXTRA_USD = 8.5;
const AFTER_HOURS_EXTRA_UZS = 103000;

type Cur = 'USD' | 'UZS';

/** Vazifaning USD→UZS kursi (shartnoma snapshot'idan) */
const taskUsdRate = (task: TaskDetail): number | null => {
  const rate = Number(task.snapshotDealAmount_exchange_rate ?? task.snapshotDealAmountExchangeRate ?? 0);
  return rate > 0 ? rate : null;
};

/**
 * Snapshot summasini kerakli valyutada qaytaradi (backend services/task-money.ts bilan bir xil).
 * 2026-09-25 dan to'lovlar (sertifikat, PSR, ishchi, bojxona) so'mda saqlanadi; eski vazifalarda
 * mijoz valyutasida — shuning uchun HAR DOIM *_currency maydoniga qaraladi.
 */
export const snapshotIn = (
  amount: number | null | undefined,
  currency: string | null | undefined,
  amountUzs: number | null | undefined,
  fallbackCurrency: Cur,
  target: Cur,
  usdRate: number | null,
): number => {
  if (amount == null && amountUzs == null) return 0;
  const cur = (currency as Cur | null | undefined) ?? fallbackCurrency;
  const rate = usdRate ?? 1;
  if (target === 'UZS') {
    if (cur === 'UZS') return Number(amountUzs ?? amount);
    return amountUzs != null ? Number(amountUzs) : Number(amount) * rate;
  }
  if (cur === 'USD') return Number(amount ?? 0);
  return Number(amountUzs ?? amount) / rate;
};

type FeeKey = 'snapshotCertificatePayment' | 'snapshotPsrPrice' | 'snapshotWorkerPrice' | 'snapshotCustomsPayment';

export const feeIn = (task: TaskDetail, key: FeeKey, target: Cur): number =>
  snapshotIn(task[key], task[`${key}_currency`], task[`${key}_amount_uzs`], getClientCurrency(task.client), target, taskUsdRate(task));

/** PSR summasi; snapshot yo'q eski vazifalarda 10 (mijoz valyutasida) */
export const getPsrAmount = (task: TaskDetail | null | undefined, target?: Cur): number => {
  if (!task || !task.hasPsr) return 0;
  const clientCur = getClientCurrency(task.client);
  const to = target ?? clientCur;
  if (task.snapshotPsrPrice == null) return snapshotIn(10, clientCur, null, clientCur, to, taskUsdRate(task));
  return feeIn(task, 'snapshotPsrPrice', to);
};

const afterHoursExtra = (currency: Cur) => (currency === 'USD' ? AFTER_HOURS_EXTRA_USD : AFTER_HOURS_EXTRA_UZS);

/** Kelishuv summasi (ko'rsatish uchun, mijoz valyutasida): asosiy + PSR + qo'shimcha to'lov */
export const getDealAmountDisplay = (
  task: TaskDetail | null | undefined,
  afterHoursDeclarationCurrent?: boolean,
): number => {
  if (!task) return 0;
  const base = Number(task.snapshotDealAmount ?? task.client?.dealAmount ?? 0);
  const currency = getClientCurrency(task.client);
  const showAfterHours = afterHoursDeclarationCurrent ?? task.afterHoursDeclaration ?? false;
  const payer = String((task.client as any)?.defaultAfterHoursPayer ?? task.afterHoursPayer ?? 'CLIENT').toUpperCase();
  const extra = showAfterHours && payer === 'CLIENT' ? afterHoursExtra(currency) : 0;
  return base + getPsrAmount(task, currency) + extra;
};

/** Asosiy kelishuv (PSR siz, mijoz valyutasida) */
export const getDealAmountBaseDisplay = (
  task: TaskDetail | null | undefined,
  afterHoursDeclarationCurrent?: boolean,
): number => {
  if (!task) return 0;
  const base = Number(task.snapshotDealAmount ?? task.client?.dealAmount ?? 0);
  const currency = getClientCurrency(task.client);
  const showAfterHours = afterHoursDeclarationCurrent ?? task.afterHoursDeclaration ?? false;
  const payer = String((task.client as any)?.defaultAfterHoursPayer ?? task.afterHoursPayer ?? 'CLIENT').toUpperCase();
  const extra = showAfterHours && payer === 'CLIENT' ? afterHoursExtra(currency) : 0;
  return base + extra;
};

/** Filial bo'yicha to'lovlar (sertifikat + ishchi + PSR + bojxona) kerakli valyutada; sukut — mijoz valyutasi */
export const getBranchPaymentsDisplay = (
  task: TaskDetail | null | undefined,
  afterHoursDeclarationCurrent?: boolean,
  target?: Cur,
): number => {
  if (!task) return 0;
  const to = target ?? getClientCurrency(task.client);
  const base = feeIn(task, 'snapshotCertificatePayment', to)
    + feeIn(task, 'snapshotWorkerPrice', to)
    + (task.hasPsr ? feeIn(task, 'snapshotPsrPrice', to) : 0)
    + feeIn(task, 'snapshotCustomsPayment', to);
  const showAfterHours = afterHoursDeclarationCurrent ?? task.afterHoursDeclaration ?? false;
  const payer = String((task.client as any)?.defaultAfterHoursPayer ?? task.afterHoursPayer ?? 'CLIENT').toUpperCase();
  const extra = showAfterHours && payer === 'COMPANY' ? afterHoursExtra(to) : 0;
  return base + extra;
};

/** BXM summasi formatlash */
export const formatBxmAmount = (
  multiplier: number,
  currentBxmUsd: number,
  currentBxmUzs: number,
  client: TaskDetail['client'] | undefined,
) => {
  const currency = getClientCurrency(client);
  const baseAmount = currency === 'USD' ? currentBxmUsd : currentBxmUzs;
  return formatMoney(baseAmount * multiplier, currency);
};

/** BXM summasi so'mda formatlash */
export const formatBxmAmountInSum = (multiplier: number, currentBxmUzs: number) =>
  formatMoney(currentBxmUzs * multiplier, 'UZS');

// ==================================================================
// Excel Export
// ==================================================================

export { AFTER_HOURS_EXTRA_USD, AFTER_HOURS_EXTRA_UZS };
