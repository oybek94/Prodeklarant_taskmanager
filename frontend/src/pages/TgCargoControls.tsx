import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

// Yuk formasining boshqaruv elementlari. Har turning o'z ko'rinishi bor, mijoz nima bosilishini bir qarashda ajratsin:
// doirali qator — bosib tanlanadi; qalamli oq katak — yoziladi; ko'k "Tanlash" — ro'yxat ochiladi; kulrang fon — faqat ko'rsatiladi.

/** Variantlar shundan ko'p bo'lsa sahifada qator-qator emas, pastdan ochiladigan ro'yxatda ko'rsatiladi */
const MAX_INLINE_OPTIONS = 8;

const ICON_PATHS = {
  check: 'M5 13l4 4L19 7',
  pencil: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  next: 'M9 6l6 6-6 6',
  close: 'M6 6l12 12M18 6L6 18',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  plus: 'M12 5v14M5 12h14',
  lock: 'M6 11h12v10H6zM8 11V8a4 4 0 018 0v3',
} as const;

export function Icon({ name }: { name: keyof typeof ICON_PATHS }) {
  return (
    <svg className="tgc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

export function ErrorText({ error }: { error?: string }) {
  return error ? <p className="tgc-error" role="alert">{error}</p> : null;
}

export function Section({ step, title, titleLang, done, action, children }: { step: number; title: string; titleLang?: 'ru'; done: boolean; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="tgc-section">
      <div className="tgc-section-head">
        {done ? (
          <span className="tgc-step tgc-step-done" role="img" aria-label="To'ldirilgan"><Icon name="check" /></span>
        ) : (
          <span className="tgc-step" aria-hidden="true">{step}</span>
        )}
        <h2 className="tgc-section-title" lang={titleLang}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

interface FieldHeadProps {
  id: string;
  label: string;
  /** Berilsa yorliq shu id'li maydonga bog'lanadi */
  htmlFor?: string;
  required?: boolean;
  filled?: boolean;
  help?: string;
}

function RequiredBadge({ filled }: { filled?: boolean }) {
  return filled ? (
    <span className="tgc-badge tgc-badge-ok"><Icon name="check" />Tayyor</span>
  ) : (
    <span className="tgc-badge">Majburiy</span>
  );
}

/** Maydon yorliqlari (`label`) guruh xabaridagi kabi ruscha */
export function FieldHead({ id, label, htmlFor, required, filled, help }: FieldHeadProps) {
  return (
    <div className="tgc-head">
      <div className="tgc-head-row">
        {htmlFor ? (
          <label className="tgc-label" lang="ru" id={`${id}-label`} htmlFor={htmlFor}>{label}</label>
        ) : (
          <span className="tgc-label" lang="ru" id={`${id}-label`}>{label}</span>
        )}
        {required && <RequiredBadge filled={filled} />}
      </div>
      {help && <p className="tgc-help">{help}</p>}
    </div>
  );
}

interface TextBoxProps {
  id: string;
  value: string;
  placeholder?: string;
  error?: string;
  maxLength?: number;
  plate?: boolean;
  /** Raqamli klaviatura: butun yoki o'nli */
  inputMode?: 'numeric' | 'decimal';
  /** O'ng tomondagi o'lchov birligi; berilsa qalam belgisi ko'rsatilmaydi */
  unit?: string;
  required?: boolean;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

export function TextBox({ id, value, placeholder, error, maxLength = 200, plate, inputMode, unit, required, onChange, onBlur }: TextBoxProps) {
  const className = `tgc-input${plate ? ' tgc-plate' : ''}${inputMode ? ' tgc-num' : ''}`;
  return (
    <label className="tgc-box" data-invalid={!!error}>
      {!inputMode && <Icon name="pencil" />}
      <input
        id={id}
        className={className}
        type="text"
        inputMode={inputMode}
        autoCapitalize={plate ? 'characters' : 'sentences'}
        autoComplete="off"
        maxLength={maxLength}
        value={value}
        placeholder={placeholder}
        aria-labelledby={`${id}-label`}
        aria-invalid={!!error}
        aria-required={required || undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      {unit && <span className="tgc-unit">{unit}</span>}
    </label>
  );
}

interface TextFieldProps extends TextBoxProps {
  anchor: string;
  label: string;
  hint?: ReactNode;
}

export function TextField({ anchor, label, hint, ...box }: TextFieldProps) {
  return (
    <div className="tgc-field" data-field={anchor}>
      <FieldHead id={box.id} htmlFor={box.id} label={label} />
      <TextBox {...box} />
      {hint}
      <ErrorText error={box.error} />
    </div>
  );
}

export interface ChoiceOption {
  value: string;
  text: string;
  sub?: string;
  /** Variantlar odatda ruscha ma'lumot (shartnoma, tovar); o'zbekchalari shu yerda belgilanadi */
  lang?: 'uz';
}

interface OptionListProps {
  options: ChoiceOption[];
  selected: string | null;
  /** Tanlangan variant qayta bosilsa tanlov bekor bo'ladi (null) */
  onSelect: (value: string | null) => void;
  /** "Boshqa — o'zim yozaman" qatori */
  other?: { active: boolean; onToggle: () => void };
  columns?: 1 | 2;
}

function OptionButton({ pressed, text, sub, lang, wide, onClick }: { pressed: boolean; text: string; sub?: string; lang?: 'uz' | 'ru'; wide?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={wide ? 'tgc-option tgc-option-wide' : 'tgc-option'} aria-pressed={pressed} onClick={onClick}>
      <span className="tgc-radio" aria-hidden="true"><Icon name="check" /></span>
      <span className="tgc-option-text">
        <span lang={lang}>{text}</span>
        {sub && <small lang={lang}>{sub}</small>}
      </span>
    </button>
  );
}

function OptionList({ options, selected, onSelect, other, columns = 1 }: OptionListProps) {
  return (
    <div className={columns === 2 ? 'tgc-options tgc-options-2' : 'tgc-options'}>
      {options.map((o) => {
        const pressed = !other?.active && selected === o.value;
        return <OptionButton key={o.value} pressed={pressed} text={o.text} sub={o.sub} lang={o.lang ?? 'ru'} onClick={() => onSelect(pressed ? null : o.value)} />;
      })}
      {other && <OptionButton wide pressed={other.active} text="Boshqa — o'zim yozaman" onClick={other.onToggle} />}
    </div>
  );
}

/**
 * Pastdan ochiladigan modal ro'yxat. `showModal` fokusni ichkarida ushlaydi va orqa fonni bosilmaydigan qiladi;
 * Escape va Telegram "orqaga" tugmasi ro'yxatni yopadi (Mini App'ni emas).
 */
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', ''); // eski WebView
    }
    const initial = dialog.querySelector<HTMLElement>('.tgc-sheet [aria-pressed="true"]') ?? dialog.querySelector<HTMLElement>('.tgc-close');
    initial?.focus();
  }, []);

  useEffect(() => {
    const backButton = window.Telegram?.WebApp?.BackButton;
    if (!backButton) return;
    try {
      backButton.onClick(onClose);
      backButton.show();
    } catch {
      // eski Telegram versiyalarida mavjud emas
    }
    return () => {
      try {
        backButton.offClick(onClose);
        backButton.hide();
      } catch {
        // eski Telegram versiyalarida mavjud emas
      }
    };
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className="tgc-sheet-layer"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      <button type="button" className="tgc-sheet-backdrop" aria-label="Yopish" tabIndex={-1} onClick={onClose} />
      <div className="tgc-sheet">
        <div className="tgc-sheet-head">
          <h3 lang="ru">{title}</h3>
          <button type="button" className="tgc-close" aria-label="Yopish" onClick={onClose}><Icon name="close" /></button>
        </div>
        <div className="tgc-sheet-list">{children}</div>
      </div>
    </dialog>
  );
}

/** Tugma bosilganda variantlar pastdan ochiladi */
function Picker({ title, options, selected, onSelect, other }: OptionListProps & { title: string }) {
  const [open, setOpen] = useState(false);
  const chosen = options.find((o) => o.value === selected);
  const current = other?.active ? 'Boshqa' : chosen?.text;
  const close = useCallback(() => setOpen(false), []);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  // Fokus ro'yxat DOM'dan chiqqandan keyin qaytariladi: modal ochiq paytda orqadagi tugma fokus olmaydi
  useEffect(() => {
    if (wasOpen.current && !open) triggerRef.current?.focus({ preventScroll: true });
    wasOpen.current = open;
  }, [open]);
  return (
    <>
      <button ref={triggerRef} type="button" className="tgc-picker" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span className="tgc-picker-value" lang={!other?.active && chosen ? (chosen.lang ?? 'ru') : undefined}>{current ?? 'Tanlanmagan'}</span>
        <span className="tgc-pill">{current ? 'Almashtirish' : 'Tanlash'}<Icon name="next" /></span>
      </button>
      {open && (
        <Sheet title={title} onClose={close}>
          <OptionList
            options={options}
            selected={selected}
            onSelect={(v) => {
              onSelect(v);
              close();
            }}
            other={
              other && {
                active: other.active,
                onToggle: () => {
                  other.onToggle();
                  close();
                },
              }
            }
          />
        </Sheet>
      )}
    </>
  );
}

interface ChoiceFieldProps {
  id: string;
  anchor: string;
  label: string;
  options: ChoiceOption[];
  value: string;
  required?: boolean;
  error?: string;
  columns?: 1 | 2;
  /** Variantlar soni oz bo'lsa ham ro'yxat tugmasi ko'rsatiladi */
  picker?: boolean;
  onSelect: (value: string | null) => void;
  /** Ro'yxatda yo'q qiymatni qo'lda yozish; variant umuman bo'lmasa faqat yozish katagi chiqadi */
  manual?: { active: boolean; placeholder: string; onToggle: () => void; onType: (value: string) => void };
}

export function ChoiceField({ id, anchor, label, options, value, required, error, columns, picker, onSelect, manual }: ChoiceFieldProps) {
  const asPicker = picker || options.length > MAX_INLINE_OPTIONS;
  const showInput = !!manual && (manual.active || options.length === 0);
  const other = manual && { active: manual.active, onToggle: manual.onToggle };
  const selected = value || null;
  return (
    <div className="tgc-field" role="group" aria-labelledby={`${id}-label`} data-field={anchor} data-invalid={!!error}>
      <FieldHead
        id={id}
        label={label}
        htmlFor={options.length === 0 ? id : undefined}
        required={required}
        filled={value.trim() !== ''}
      />
      {options.length > 0 &&
        (asPicker ? (
          <Picker title={label} options={options} selected={selected} onSelect={onSelect} other={other} />
        ) : (
          <OptionList options={options} selected={selected} onSelect={onSelect} other={other} columns={columns} />
        ))}
      {showInput && <TextBox id={id} value={value} placeholder={manual.placeholder} error={error} onChange={manual.onType} />}
      <ErrorText error={error} />
    </div>
  );
}

export interface NumberCell {
  id: string;
  anchor: string;
  label: string;
  value: string;
  unit?: string;
  decimal?: boolean;
  required?: boolean;
  error?: string;
  onChange: (value: string) => void;
}

const sanitizeCount = (v: string) => v.replace(/\D/g, '');
/** Faqat raqam va bitta ajratuvchi (nuqta yoki vergul) */
const sanitizeDecimal = (v: string) => {
  const cleaned = v.replace(/[^\d.,]/g, '');
  const sepIndex = cleaned.search(/[.,]/);
  if (sepIndex === -1) return cleaned;
  return cleaned.slice(0, sepIndex + 1) + cleaned.slice(sepIndex + 1).replace(/[.,]/g, '');
};

export function NumberBox({ id, value, unit, decimal, required, error, onChange }: Omit<NumberCell, 'anchor' | 'label'>) {
  return (
    <TextBox
      id={id}
      required={required}
      value={value}
      unit={unit}
      inputMode={decimal ? 'decimal' : 'numeric'}
      placeholder="0"
      error={error}
      onChange={(v) => onChange(decimal ? sanitizeDecimal(v) : sanitizeCount(v))}
    />
  );
}

/** Yonma-yon raqamli kataklar (masalan yashiklar soni va og'irligi). "Majburiy" belgisi aynan majburiy katak ostida */
export function NumberGroup({ id, title, cells }: { id: string; title: string; cells: NumberCell[] }) {
  return (
    <div className="tgc-field" role="group" aria-labelledby={`${id}-label`}>
      <FieldHead id={id} label={title} />
      <div className="tgc-pair">
        {cells.map(({ anchor, label, ...cell }) => (
          <div key={cell.id} className="tgc-cell" data-field={anchor}>
            <label className="tgc-sublabel" lang="ru" id={`${cell.id}-label`} htmlFor={cell.id}>{label}</label>
            <NumberBox {...cell} />
            {cell.required && <RequiredBadge filled={cell.value !== ''} />}
            <ErrorText error={cell.error} />
          </div>
        ))}
      </div>
    </div>
  );
}
