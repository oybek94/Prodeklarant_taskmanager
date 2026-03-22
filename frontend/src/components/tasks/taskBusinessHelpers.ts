import apiClient from '../../lib/api';
import { getClientCurrency, formatMoney } from './taskHelpers';
import type { TaskDetail } from './types';

// ==================================================================
// Phone helper
// ==================================================================

/** Telefon raqamidan bo'shliqlarni olib tashlash, + belgisini saqlash */
export const cleanPhoneNumber = (phone: string): string =>
  phone.replace(/\s+/g, '');

// ==================================================================
// Telegram
// ==================================================================

/** Branch telefon raqamlari va xarita manzili (hardcoded) */
const branchInfo: Record<string, { address: string; phones: string[] }> = {
  'Oltiariq': {
    address: 'https://yandex.ru/maps/-/CLWAuE5H',
    phones: ['+998939079017', '+998339077778', '+998947877475'],
  },
  'Toshkent': {
    address: 'https://yandex.ru/maps/-/CLWAy4Y9',
    phones: ['+998976616121', '+998939079017', '+998339077778'],
  },
};

/** Telegram xabar matnini yaratish */
export const generateTelegramMessage = (task: TaskDetail): string => {
  const taskName = task.title;
  const branchName = task.branch.name;
  const baseUrl =
    import.meta.env.VITE_PUBLIC_BASE_URL ||
    import.meta.env.VITE_FRONTEND_URL ||
    window.location.origin;
  const documentsUrl = task.qrToken ? `${baseUrl}/q/${task.qrToken}` : null;

  const branch = branchInfo[branchName] || branchInfo['Oltiariq'];
  const phoneLines = branch.phones.map((phone) => `📞 Tel: ${phone}`).join('\n');

  return `📄 *HUJJATINGIZ TAYYOR* ✅\n━━━━━━━━━━━━━━━━━━\n🆔 *Hujjat raqami:*\n${taskName}\n\n${phoneLines}\n📌 Xarita: ${branch.address}\n\n📎 *Elektron hujjatlar*\n👇 Yuklab olish / ko'rish:\n🔗 ${documentsUrl || ''}\n\n🤝 Savollaringiz bo'lsa — bemalol murojaat qiling!`;
};

/** Telegram linkni ochish (QR token kerak bo'lsa avval generatsiya) */
export const handleTelegramClick = async (
  selectedTask: TaskDetail,
  setSelectedTask: (task: TaskDetail) => void,
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

  const message = generateTelegramMessage(taskForMessage);
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

export const getPsrAmount = (task?: { hasPsr?: boolean; snapshotPsrPrice?: number | null }) =>
  task?.hasPsr ? Number(task.snapshotPsrPrice || 0) : 0;

/** Kelishuv summasi (ko'rsatish uchun): asosiy + PSR + qo'shimcha to'lov */
export const getDealAmountDisplay = (
  task: TaskDetail | null | undefined,
  afterHoursDeclarationCurrent?: boolean,
): number => {
  if (!task) return 0;
  const base = Number(task.snapshotDealAmount ?? task.client?.dealAmount ?? 0);
  const psr = getPsrAmount(task);
  const currency = getClientCurrency(task.client);
  const showAfterHours = afterHoursDeclarationCurrent ?? task.afterHoursDeclaration ?? false;
  const payer = String((task.client as any)?.defaultAfterHoursPayer ?? task.afterHoursPayer ?? 'CLIENT').toUpperCase();
  const extra = showAfterHours && payer === 'CLIENT'
    ? (currency === 'USD' ? AFTER_HOURS_EXTRA_USD : AFTER_HOURS_EXTRA_UZS) : 0;
  return base + psr + extra;
};

/** Asosiy kelishuv (PSR siz) */
export const getDealAmountBaseDisplay = (
  task: TaskDetail | null | undefined,
  afterHoursDeclarationCurrent?: boolean,
): number => {
  if (!task) return 0;
  const base = Number(task.snapshotDealAmount ?? task.client?.dealAmount ?? 0);
  const currency = getClientCurrency(task.client);
  const showAfterHours = afterHoursDeclarationCurrent ?? task.afterHoursDeclaration ?? false;
  const payer = String((task.client as any)?.defaultAfterHoursPayer ?? task.afterHoursPayer ?? 'CLIENT').toUpperCase();
  const extra = showAfterHours && payer === 'CLIENT'
    ? (currency === 'USD' ? AFTER_HOURS_EXTRA_USD : AFTER_HOURS_EXTRA_UZS) : 0;
  return base + extra;
};

/** Filial bo'yicha to'lovlar */
export const getBranchPaymentsDisplay = (
  task: TaskDetail | null | undefined,
  afterHoursDeclarationCurrent?: boolean,
): number => {
  if (!task) return 0;
  const certificatePayment = Number(task.snapshotCertificatePayment || 0);
  const workerPrice = Number(task.snapshotWorkerPrice || 0);
  const psrPrice = task.hasPsr ? Number(task.snapshotPsrPrice || 0) : 0;
  const customsPayment = Number(task.snapshotCustomsPayment || 0);
  const base = certificatePayment + workerPrice + psrPrice + customsPayment;
  const currency = getClientCurrency(task.client);
  const showAfterHours = afterHoursDeclarationCurrent ?? task.afterHoursDeclaration ?? false;
  const payer = String((task.client as any)?.defaultAfterHoursPayer ?? task.afterHoursPayer ?? 'CLIENT').toUpperCase();
  const extra = showAfterHours && payer === 'COMPANY'
    ? (currency === 'USD' ? AFTER_HOURS_EXTRA_USD : AFTER_HOURS_EXTRA_UZS) : 0;
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
