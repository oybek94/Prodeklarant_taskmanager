import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';

export type FieldHintContent = {
  /** Maydon nomi — yordam oynasining sarlavhasi */
  title: string;
  /** Shartnomadan qaysi ma'lumot olinishi — sodda tilda tushuntirish */
  text: string;
  /** Ixtiyoriy misol: "12/2026-EX" kabi */
  example?: string;
};

type FieldHintProps = FieldHintContent & {
  className?: string;
};

const POPOVER_WIDTH = 320;
const MARGIN = 8;

/**
 * Maydon yonidagi kichik "i" tugmasi. Bosilganda maydonga nima yozilishi
 * kerakligi haqida qisqa tushuntirish chiqadi.
 *
 * Oyna `document.body` ga portal qilinadi — aks holda modalning
 * `overflow-y-auto` konteyneri uni qirqib qo'yadi.
 */
const FieldHint: React.FC<FieldHintProps> = ({ title, text, example, className }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: POPOVER_WIDTH,
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const width = Math.min(POPOVER_WIDTH, window.innerWidth - MARGIN * 2);
    const height = popoverRef.current?.offsetHeight ?? 150;

    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.min(Math.max(MARGIN, left), window.innerWidth - width - MARGIN);

    let top = rect.bottom + 8;
    if (top + height > window.innerHeight - MARGIN) {
      const above = rect.top - 8 - height;
      top = above >= MARGIN ? above : Math.max(MARGIN, window.innerHeight - height - MARGIN);
    }

    setPos({ top, left, width });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    // Kontent chizilgandan keyin balandligi aniq bo'ladi — qayta o'lchaymiz.
    const raf = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(raf);
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    // Escape faqat yordam oynasini yopsin — ortidagi modal ochiq qolsin.
    // Shuning uchun capture bosqichida ushlab, hodisani to'xtatamiz.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`${title} — ma'lumot`}
        aria-expanded={open}
        title="Bu maydon haqida"
        className={`inline-flex shrink-0 items-center justify-center text-gray-400 hover:text-blue-600 transition-colors align-middle ${open ? 'text-blue-600' : ''} ${className ?? ''}`}
      >
        <Icon icon="solar:info-circle-bold-duotone" className="w-4 h-4" />
      </button>

      {open && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-xl shadow-2xl p-3 text-left"
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Yopish"
              className="text-gray-400 hover:text-gray-600 shrink-0"
            >
              <Icon icon="solar:close-circle-bold-duotone" className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs leading-relaxed text-gray-600 whitespace-pre-line">{text}</p>
          {example && (
            <p className="mt-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
              <span className="font-medium text-gray-600">Misol: </span>
              {example}
            </p>
          )}
        </div>,
        document.body,
      )}
    </>
  );
};

export default FieldHint;
