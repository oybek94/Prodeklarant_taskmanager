// Tasks sahifasi uchun pure helper funksiyalar (state ishlatmaydi)
import { Icon } from '@iconify/react';
import React from 'react';
import type { TaskStage } from './types';

/** Sanani formatlash: "20 Mar 2026; 14:35" */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleDateString('en-GB', { month: 'short' });
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} ${year}; ${hours}:${minutes}`;
};

/** Fayl hajmini formatlash: "1.23 MB" */
export const formatFileSize = (bytes?: number): string => {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/** Daqiqalarni formatlash: "2 soat, 15 daqiqa" */
export const formatDuration = (minutes: number | null): string => {
  if (minutes === null || minutes < 0) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours} soat, ${mins} daqiqa`;
  if (hours > 0) return `${hours} soat`;
  return `${mins} daqiqa`;
};

/** Task statusini label va rang bilan qaytaradi */
export const getStatusInfo = (status: string): { label: string; color: string } => {
  switch (status) {
    case 'BOSHLANMAGAN':
      return { label: 'Boshlanmagan', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 dark:border dark:border-red-800/50' };
    case 'JARAYONDA':
      return { label: 'Jarayonda', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border dark:border-yellow-800/50' };
    case 'TAYYOR':
      return { label: 'Xujjat tayyor', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 dark:border dark:border-blue-800/50' };
    case 'TEKSHIRILGAN':
      return { label: 'Xujjat tekshirilgan', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 dark:border dark:border-purple-800/50' };
    case 'TOPSHIRILDI':
      return { label: 'Xujjat topshirildi', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border dark:border-indigo-800/50' };
    case 'YAKUNLANDI':
      return { label: 'Yakunlandi', color: 'bg-green-100 text-green-800 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border dark:border-emerald-800/50' };
    default:
      return { label: "Noma'lum", color: 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-400 dark:border dark:border-slate-700' };
  }
};

/** Fayl turiga qarab icon qaytaradi */
export const getFileIcon = (fileType: string, fileName?: string): React.ReactElement => {
  const lowerType = fileType?.toLowerCase() || '';
  const lowerName = fileName?.toLowerCase() || '';
  const base = 'inline-flex h-8 w-8 items-center justify-center rounded-lg border';
  const icon = 'w-4 h-4';

  if (lowerType.includes('pdf') || lowerName.endsWith('.pdf'))
    return <span className={`${base} border-red-200 bg-red-50 text-red-600`}><Icon icon="lucide:file-text" className={icon} /></span>;
  if (lowerType.includes('excel') || lowerType.includes('spreadsheet') || lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx'))
    return <span className={`${base} border-emerald-200 bg-emerald-50 text-emerald-600`}><Icon icon="lucide:file-spreadsheet" className={icon} /></span>;
  if (lowerType.includes('word') || lowerType.includes('document') || lowerName.endsWith('.doc') || lowerName.endsWith('.docx'))
    return <span className={`${base} border-blue-200 bg-blue-50 text-blue-600`}><Icon icon="lucide:file-text" className={icon} /></span>;
  if (lowerType.includes('jpeg') || lowerType.includes('jpg') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') ||
    lowerType.includes('png') || lowerName.endsWith('.png') || lowerType.includes('image') || lowerType.includes('gif') || lowerType.includes('webp') ||
    lowerName.match(/\.(gif|webp|bmp|svg)$/i))
    return <span className={`${base} border-amber-200 bg-amber-50 text-amber-600`}><Icon icon="lucide:image" className={icon} /></span>;
  if (lowerType.includes('powerpoint') || lowerType.includes('presentation') || lowerName.endsWith('.ppt') || lowerName.endsWith('.pptx'))
    return <span className={`${base} border-orange-200 bg-orange-50 text-orange-600`}><Icon icon="lucide:presentation" className={icon} /></span>;
  if (lowerType.includes('rar') || lowerName.endsWith('.rar') || lowerType.includes('zip') || lowerName.endsWith('.zip'))
    return <span className={`${base} border-gray-200 bg-gray-50 text-gray-600`}><Icon icon="lucide:archive" className={icon} /></span>;
  if (lowerType.includes('video') || lowerName.match(/\.(mp4|avi|mov|wmv|flv|mkv)$/i))
    return <span className={`${base} border-rose-200 bg-rose-50 text-rose-600`}><Icon icon="lucide:video" className={icon} /></span>;
  if (lowerType.includes('audio') || lowerName.match(/\.(mp3|wav|ogg|m4a)$/i))
    return <span className={`${base} border-purple-200 bg-purple-50 text-purple-600`}><Icon icon="lucide:music" className={icon} /></span>;
  return <span className={`${base} border-gray-200 bg-gray-50 text-gray-600`}><Icon icon="lucide:file" className={icon} /></span>;
};

/** Fayl preview qilib bo'ladimi? */
export const canPreview = (fileType: string): boolean =>
  fileType?.includes('image') || fileType?.includes('pdf') ||
  fileType?.includes('video') || fileType?.includes('audio');

/** OCR qo'llab-quvvatlanishini tekshirish (PDF yoki JPG) */
export const canShowOCR = (fileType: string, fileName: string): boolean => {
  const lowerType = (fileType || '').toLowerCase();
  const lowerName = (fileName || '').toLowerCase();
  return lowerType.includes('pdf') || lowerType.includes('jpeg') || lowerType.includes('jpg') ||
    lowerName.endsWith('.pdf') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg');
};

/** Avatar rangi (ismolli avatarlar uchun) */
export const getAvatarColor = (name: string): string => {
  const colors = [
    'bg-yellow-200 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-300 dark:ring-1 dark:ring-yellow-700/50', 
    'bg-pink-200 text-pink-900 dark:bg-pink-900/40 dark:text-pink-300 dark:ring-1 dark:ring-pink-700/50', 
    'bg-sky-200 text-sky-900 dark:bg-sky-900/40 dark:text-sky-300 dark:ring-1 dark:ring-sky-700/50', 
    'bg-emerald-200 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-1 dark:ring-emerald-700/50', 
    'bg-violet-200 text-violet-900 dark:bg-violet-900/40 dark:text-violet-300 dark:ring-1 dark:ring-violet-700/50'
  ];
  return colors[name.charCodeAt(0) % colors.length];
};

/** Ismning bosh harflari */
export const getInitials = (name: string): string =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

/** Stage uchun vaqt hisoblash (daqiqalarda) */
export const calculateStageDuration = (
  stage: TaskStage,
  allStages: TaskStage[],
  taskCreatedAt: string
): number | null => {
  if (!stage.completedAt) return null;
  const completedAt = new Date(stage.completedAt);
  let startTime: Date | null = null;

  const findCompleted = (name: string) =>
    allStages.find(s => s.name === name && s.status === 'TAYYOR')?.completedAt;

  switch (stage.name) {
    case 'Invoys':
      startTime = new Date(taskCreatedAt); break;
    case 'Zayavka':
    case 'TIR-SMR': {
      const t = findCompleted('Invoys');
      startTime = t ? new Date(t) : new Date(taskCreatedAt); break;
    }
    case 'Sertifikat olib chiqish':
    case 'ST':
    case 'Fito':
    case 'FITO': {
      const t = findCompleted('Zayavka');
      startTime = t ? new Date(t) : new Date(taskCreatedAt); break;
    }
    case 'Deklaratsiya': {
      const stageNames = ['Sertifikat olib chiqish', 'ST', 'Fito', 'FITO'];
      const t = allStages.find(s => stageNames.includes(s.name) && s.status === 'TAYYOR')?.completedAt;
      startTime = t ? new Date(t) : new Date(taskCreatedAt); break;
    }
    case 'Tekshirish': {
      const t = findCompleted('Deklaratsiya');
      startTime = t ? new Date(t) : new Date(taskCreatedAt); break;
    }
    case 'Topshirish':
    case 'Xujjat_topshirish':
    case 'Xujjat topshirish': {
      const t = findCompleted('Deklaratsiya');
      startTime = t ? new Date(t) : new Date(taskCreatedAt); break;
    }
    case 'Pochta': {
      const t = findCompleted('Deklaratsiya');
      startTime = t ? new Date(t) : new Date(taskCreatedAt); break;
    }
    default:
      startTime = new Date(taskCreatedAt);
  }

  if (!startTime) return null;
  return Math.floor((completedAt.getTime() - startTime.getTime()) / 60000);
};

/** Stage vaqtini baholash */
export const evaluateStageTime = (
  stageName: string, minutes: number | null
): { rating: 'alo' | 'ortacha' | 'yomon'; color: string; icon: string } => {
  if (minutes === null || minutes < 0)
    return { rating: 'yomon', color: 'text-red-500', icon: 'fa-hourglass-half' };

  const thresholds: Record<string, { alo: number; ortacha: number }> = {
    'Invoys': { alo: 10, ortacha: 20 },
    'Zayavka': { alo: 15, ortacha: 20 },
    'TIR-SMR': { alo: 15, ortacha: 20 },
    'Sertifikat olib chiqish': { alo: 30, ortacha: 60 },
    'ST': { alo: 30, ortacha: 60 },
    'Fito': { alo: 30, ortacha: 60 },
    'FITO': { alo: 30, ortacha: 60 },
    'Deklaratsiya': { alo: 20, ortacha: 30 },
    'Tekshirish': { alo: 5, ortacha: 10 },
    'Topshirish': { alo: 30, ortacha: 60 },
    'Xujjat_topshirish': { alo: 30, ortacha: 60 },
    'Xujjat topshirish': { alo: 30, ortacha: 60 },
    'Pochta': { alo: 60, ortacha: 120 },
  };
  const t = thresholds[stageName] || { alo: 30, ortacha: 60 };

  if (minutes < t.alo) return { rating: 'alo', color: 'text-green-500', icon: 'fa-fire' };
  if (minutes < t.ortacha) return { rating: 'ortacha', color: 'text-yellow-500', icon: 'fa-circle-half-stroke' };
  return { rating: 'yomon', color: 'text-red-500', icon: 'fa-clock' };
};

/** Pul miqdorini formatlash */
export const formatMoney = (amount: number, currency: 'USD' | 'UZS'): string => {
  const formatted = new Intl.NumberFormat('uz-UZ', {
    minimumFractionDigits: currency === 'USD' ? 2 : 0,
    maximumFractionDigits: currency === 'USD' ? 2 : 0,
  }).format(amount).replace(/,/g, ' ');
  return currency === 'USD' ? `$ ${formatted}` : `UZS ${formatted}`;
};

/** Mijoz valyutasini aniqlash */
export const getClientCurrency = (
  client?: { dealAmount_currency?: 'USD' | 'UZS'; dealAmountCurrency?: 'USD' | 'UZS' }
): 'USD' | 'UZS' => client?.dealAmount_currency || client?.dealAmountCurrency || 'USD';
