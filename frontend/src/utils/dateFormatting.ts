import { format, formatDistanceToNow, isToday, isYesterday, isThisYear } from 'date-fns';
import { uz } from 'date-fns/locale';

/**
 * Format only date: "27.05.2026"
 */
export const formatDateOnly = (dateStr: string | Date | null | undefined): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return format(d, 'dd.MM.yyyy');
  } catch (e) {
    return String(dateStr);
  }
};

/**
 * Format date and time: "27.05.2026, 14:30" (24h format)
 */
export const formatDateTime = (dateStr: string | Date | null | undefined): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return format(d, 'dd.MM.yyyy, HH:mm');
  } catch (e) {
    return String(dateStr);
  }
};

/**
 * Format relative time (humanized): "2 soat oldin", "Bugun 14:30 da", "Kecha 14:30 da"
 */
export const formatRelativeTime = (dateStr: string | Date | null | undefined): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    
    // Custom logic for today/yesterday for precise UX
    if (isToday(d)) {
      return `Bugun ${format(d, 'HH:mm')} da`;
    }
    
    if (isYesterday(d)) {
      return `Kecha ${format(d, 'HH:mm')} da`;
    }
    
    // If it's within the last 7 days but not today/yesterday, use relative (e.g. "2 kun oldin")
    const now = new Date();
    const diffTime = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 7 && diffDays >= 0) {
      return formatDistanceToNow(d, { addSuffix: true, locale: uz });
    }
    
    // Fallback to absolute
    return format(d, 'dd.MM.yyyy, HH:mm');
  } catch (e) {
    return String(dateStr);
  }
};

/**
 * Generic formatDate function to replace the one that was commonly defined locally
 * It maps to formatDateOnly by default to preserve backward compatibility in tables,
 * but can be overridden.
 */
export const formatDate = (dateStr: string | Date | null | undefined, includeTime: boolean = false): string => {
  return includeTime ? formatDateTime(dateStr) : formatDateOnly(dateStr);
};
