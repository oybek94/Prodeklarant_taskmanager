import { useState, type ReactNode } from 'react';

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

export function Section({ step, title, done, action, children }: { step: number; title: string; done: boolean; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="tgc-section">
      <div className="tgc-section-head">
        {done ? (
          <span className="tgc-step tgc-step-done" role="img" aria-label="To'ldirilgan"><Icon name="check" /></span>
        ) : (
          <span className="tgc-step" aria-hidden="true">{step}</span>
        )}
        <h2 className="tgc-section-title">{title}</h2>
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

export function FieldHead({ id, label, htmlFor, required, filled, help }: FieldHeadProps) {
  return (
    <div className="tgc-head">
      <div className="tgc-head-row">
        {htmlFor ? (
          <label className="tgc-label" id={`${id}-label`} htmlFor={htmlFor}>{label}</label>
        ) : (
          <span className="tgc-label" id={`${id}-label`}>{label}</span>
        )}
        {required &&
          (filled ? (
            <span className="tgc-badge tgc-badge-ok"><Icon name="check" />Tayyor</span>
          ) : (
            <span className="tgc-badge">Majburiy</span>
          ))}
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
  onChange: (value: string) => void;
  onBlur?: () => void;
}

export function TextBox({ id, value, placeholder, error, maxLength = 200, plate, inputMode, unit, onChange, onBlur }: TextBoxProps) {
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

function OptionButton({ pressed, text, sub, wide, onClick }: { pressed: boolean; text: string; sub?: string; wide?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={wide ? 'tgc-option tgc-option-wide' : 'tgc-option'} aria-pressed={pressed} onClick={onClick}>
      <span className="tgc-radio" aria-hidden="true"><Icon name="check" /></span>
      <span className="tgc-option-text">
        <span>{text}</span>
        {sub && <small>{sub}</small>}
      </span>
    </button>
  );
}

function OptionList({ options, selected, onSelect, other, columns = 1 }: OptionListProps) {
  return (
    <div className={columns === 2 ? 'tgc-options tgc-options-2' : 'tgc-options'}>
      {options.map((o) => {
        const pressed = !other?.active && selected === o.value;
        return <OptionButton key={o.value} pressed={pressed} text={o.text} sub={o.sub} onClick={() => onSelect(pressed ? null : o.value)} />;
      })}
      {other && <OptionButton wide pressed={other.active} text="Boshqa — o'zim yozaman" onClick={other.onToggle} />}
    </div>
  );
}

/** Tugma bosilganda variantlar pastdan ochiladi */
function Picker({ title, options, selected, onSelect, other }: OptionListProps & { title: string }) {
  const [open, setOpen] = useState(false);
  const current = other?.active ? 'Boshqa' : options.find((o) => o.value === selected)?.text;
  const close = () => setOpen(false);
  return (
    <>
      <button type="button" className="tgc-picker" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span className="tgc-picker-value">{current ?? 'Tanlanmagan'}</span>
        <span className="tgc-pill">{current ? 'Almashtirish' : 'Tanlash'}<Icon name="next" /></span>
      </button>
      {open && (
        <div className="tgc-sheet-layer">
          <button type="button" className="tgc-sheet-backdrop" aria-label="Yopish" tabIndex={-1} onClick={close} />
          <div className="tgc-sheet" role="dialog" aria-modal="true" aria-label={title}>
            <div className="tgc-sheet-head">
              <h3>{title}</h3>
              <button type="button" className="tgc-close" aria-label="Yopish" onClick={close}><Icon name="close" /></button>
            </div>
            <div className="tgc-sheet-list">
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
            </div>
          </div>
        </div>
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

export function NumberBox({ id, value, unit, decimal, error, onChange }: Omit<NumberCell, 'anchor' | 'label'>) {
  return (
    <TextBox
      id={id}
      value={value}
      unit={unit}
      inputMode={decimal ? 'decimal' : 'numeric'}
      placeholder="0"
      error={error}
      onChange={(v) => onChange(decimal ? sanitizeDecimal(v) : sanitizeCount(v))}
    />
  );
}

/** Yonma-yon raqamli kataklar (masalan yashiklar soni va og'irligi) */
export function NumberGroup({ id, title, required, filled, cells }: { id: string; title: string; required?: boolean; filled?: boolean; cells: NumberCell[] }) {
  return (
    <div className="tgc-field" role="group" aria-labelledby={`${id}-label`}>
      <FieldHead id={id} label={title} required={required} filled={filled} />
      <div className="tgc-pair">
        {cells.map(({ anchor, label, ...cell }) => (
          <div key={cell.id} className="tgc-cell" data-field={anchor}>
            <label className="tgc-sublabel" id={`${cell.id}-label`} htmlFor={cell.id}>{label}</label>
            <NumberBox {...cell} />
            <ErrorText error={cell.error} />
          </div>
        ))}
      </div>
    </div>
  );
}
