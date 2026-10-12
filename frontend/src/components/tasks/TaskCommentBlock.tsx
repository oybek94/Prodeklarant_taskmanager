import React, { useEffect, useRef, useState } from 'react';

const MAX_LENGTH = 500;
const QUICK_PHRASES = [
  'Hujjat kutilmoqda.',
  "Mijozga qo'ng'iroq qilindi.",
  'Original kerak.',
  'Shoshilinch!',
];

const svgProps = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const IcComment = () => <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="1.8" {...svgProps}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4V16A2.5 2.5 0 0 1 4 13.5v-8Z" /></svg>;
const IcPen = () => <svg width="15" height="15" viewBox="0 0 24 24" strokeWidth="2" {...svgProps}><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></svg>;
const IcPlus = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="3" {...svgProps}><path d="M12 5v14M5 12h14" /></svg>;
const IcCheck = () => <svg width="13" height="13" viewBox="0 0 24 24" strokeWidth="3" {...svgProps}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;

interface TaskCommentBlockProps {
  /** Foydalanuvchi yozgan izoh (bo'sh bo'lishi mumkin) */
  value: string;
  isMobile: boolean;
  /** Muvaffaqiyatli saqlansa true */
  onSave: (comments: string) => Promise<boolean>;
}

const TaskCommentBlock: React.FC<TaskCommentBlockProps> = ({ value, isMobile, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!justSaved) return;
    const timer = window.setTimeout(() => setJustSaved(false), 3000);
    return () => window.clearTimeout(timer);
  }, [justSaved]);

  useEffect(() => {
    if (!editing) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [editing]);

  const startEdit = () => {
    setDraft(value);
    setJustSaved(false);
    setEditing(true);
  };
  const cancel = () => {
    if (saving) return;
    setEditing(false);
  };
  const unchanged = draft.trim() === value.trim();

  const save = async () => {
    if (saving || unchanged) return;
    setSaving(true);
    const ok = await onSave(draft);
    setSaving(false);
    if (ok) {
      setEditing(false);
      setJustSaved(draft.trim().length > 0);
    }
  };

  const addPhrase = (phrase: string) => {
    const base = draft.trimEnd();
    const next = base ? `${base} ${phrase}` : phrase;
    setDraft(next.slice(0, MAX_LENGTH));
    textareaRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      void save();
    } else if (e.key === 'Escape') {
      // Escape faqat izoh tahririni yopsin — butun oyna yopilmasin
      e.preventDefault();
      e.stopPropagation();
      cancel();
    }
  };

  const wrap = 'relative z-10 px-4 pt-4 sm:px-7 sm:pt-5';
  const label = 'text-[11px] font-bold uppercase tracking-[0.06em] text-[#8a5a00] dark:text-amber-400';

  if (editing) {
    return (
      <div className={wrap}>
        <div className="flex flex-col gap-3 p-3.5 sm:px-4 rounded-xl bg-[#fff8e8] border border-[#e9c97a] dark:bg-amber-500/10 dark:border-amber-500/40">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="task-comment" className={`flex items-center gap-2 ${label}`}>
              <IcComment />Izoh
            </label>
            <span className="text-xs text-[#6b5a2e] dark:text-amber-200/70" style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>
              {draft.length} / {MAX_LENGTH}
            </span>
          </div>
          <textarea
            id="task-comment"
            ref={textareaRef}
            rows={3}
            maxLength={MAX_LENGTH}
            value={draft}
            disabled={saving}
            placeholder="Bu vazifa bo'yicha izoh yozing…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            style={{ fieldSizing: 'content' } as React.CSSProperties}
            className={`w-full box-border min-h-[96px] sm:min-h-[84px] max-h-[220px] resize-none px-3.5 py-3 rounded-[10px] border border-[#e1c47c] bg-white text-[#14161f] placeholder:text-[#7a7f90] leading-normal focus:outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5] dark:bg-slate-900 dark:border-amber-500/40 dark:text-gray-100 ${isMobile ? 'text-base' : 'text-sm'}`}
          />
          <div className={`flex items-center gap-2 ${isMobile ? 'overflow-x-auto -mx-3.5 px-3.5' : 'flex-wrap'}`}>
            {!isMobile && <span className="text-xs text-[#6b5a2e] dark:text-amber-200/70 mr-0.5">Tez qo'shish:</span>}
            {QUICK_PHRASES.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => addPhrase(phrase)}
                disabled={saving}
                className="shrink-0 whitespace-nowrap h-11 sm:h-8 pl-3 pr-3.5 sm:pl-2.5 rounded-full border border-[#e9cf8e] bg-[#fffdf6] text-[#5c3d00] text-sm sm:text-[13px] font-medium flex items-center gap-1.5 cursor-pointer hover:bg-white hover:border-[#d9b45c] transition-colors dark:bg-slate-900 dark:border-amber-500/40 dark:text-amber-200 dark:hover:bg-slate-800"
              >
                <IcPlus size={isMobile ? 13 : 12} />
                {phrase.replace(/[.!]$/, '')}
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-[#f0dca8] dark:border-amber-500/20">
            <span className="hidden sm:inline text-xs text-[#6b5a2e] dark:text-amber-200/70">
              <b className="font-semibold">Ctrl + Enter</b> — saqlash · <b className="font-semibold">Esc</b> — bekor qilish
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancel}
                disabled={saving}
                className="flex-1 sm:flex-none h-12 sm:h-10 px-4 rounded-xl sm:rounded-[10px] border border-[#d9c18a] text-[#3b4152] dark:border-amber-500/40 dark:text-gray-300 text-[15px] sm:text-sm font-semibold cursor-pointer hover:bg-[#f4f5fa] dark:hover:bg-slate-800 transition-colors"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving || unchanged}
                className="flex-[1.4] sm:flex-none h-12 sm:h-10 px-5 rounded-xl sm:rounded-[10px] bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[15px] sm:text-sm font-semibold cursor-pointer transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {saving ? 'Saqlanmoqda…' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!value) {
    return (
      <div className={wrap}>
        <button
          type="button"
          onClick={startEdit}
          className="w-full min-h-[52px] flex items-center gap-3 px-3.5 sm:px-4 rounded-xl border-[1.5px] border-dashed border-[#c5cbe0] bg-[#fafbfd] text-left text-[#3b4152] cursor-pointer hover:bg-[#f3f4fb] hover:border-[#a9b0d6] transition-colors dark:border-slate-600 dark:bg-slate-800/40 dark:text-gray-300 dark:hover:bg-slate-800 dark:hover:border-slate-500"
        >
          <span className="w-7 h-7 rounded-full bg-[#eef0ff] text-[#4f46e5] flex items-center justify-center shrink-0 dark:bg-indigo-500/20 dark:text-indigo-300">
            <IcPlus size={16} />
          </span>
          <span className="text-sm font-semibold">Izoh qo'shish</span>
          <span className="hidden sm:inline text-[13px] text-[#5d6272] dark:text-gray-400">— xodimlarga ko'rinadigan eslatma, masalan: hujjat kutilmoqda</span>
        </button>
      </div>
    );
  }

  return (
    <div className={wrap}>
      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 p-3.5 sm:py-3.5 sm:pl-4 sm:pr-3 rounded-xl bg-[#fff8e8] border border-[#f2d9a2] dark:bg-amber-500/10 dark:border-amber-500/30">
        <div className="flex gap-2.5 sm:gap-3 flex-1 min-w-0">
          <span className="shrink-0 mt-0.5 text-[#8a5a00] dark:text-amber-400"><IcComment /></span>
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <span className={label}>Izoh</span>
              {justSaved && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#146c36] dark:text-emerald-400">
                  <IcCheck />Saqlandi
                </span>
              )}
            </div>
            <span className="text-sm leading-normal text-[#14161f] dark:text-gray-200 whitespace-pre-wrap break-words">{value}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={startEdit}
          aria-label="Izohni tahrirlash"
          className="shrink-0 sm:self-start h-11 sm:h-9 px-3 rounded-[10px] sm:rounded-[9px] border border-[#ecd08e] text-[#7a4d00] text-sm sm:text-[13px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#fff1cf] transition-colors dark:border-amber-500/40 dark:text-amber-300 dark:hover:bg-amber-500/20"
        >
          <IcPen />
          <span className="sm:inline">Tahrirlash</span>
        </button>
      </div>
    </div>
  );
};

export default TaskCommentBlock;
