import { useEffect, type RefObject } from 'react';

/**
 * Click-outside hook: element tashqarisiga bosilganda callback chaqiradi.
 * @param ref - Kuzatiladigan element ref
 * @param isOpen - Hook faqat true bo'lganda ishlaydi
 * @param onClose - Tashqariga bosilganda chaqiriladigan funksiya
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onClose: () => void
): void {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, isOpen, onClose]);
}
