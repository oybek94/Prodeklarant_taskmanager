import { useEffect, useState } from 'react';

type DateInputProps = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
};

const toDisplay = (iso: string) => {
  const parts = iso.split('-');
  if (parts.length !== 3) return '';
  const [year, month, day] = parts;
  if (!year || !month || !day) return '';
  return `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
};

const toIso = (display: string) => {
  const parts = display.split('.');
  if (parts.length !== 3) return '';
  const [day, month, year] = parts;
  if (!day || !month || !year) return '';
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const isValidDate = (display: string) => {
  const parts = display.split('.');
  if (parts.length !== 3) return false;
  const [dayRaw, monthRaw, yearRaw] = parts;
  if (dayRaw.length !== 2 || monthRaw.length !== 2 || yearRaw.length !== 4) return false;
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);
  if (!day || !month || !year) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

const formatWithDots = (raw: string) => {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  if (digits.length <= 2) return day;
  if (digits.length <= 4) return `${day}.${month}`;
  return `${day}.${month}.${year}`;
};

const DateInput = ({ value, onChange, required, className, placeholder, disabled, name }: DateInputProps) => {
  const [displayValue, setDisplayValue] = useState(toDisplay(value));

  useEffect(() => {
    setDisplayValue(toDisplay(value));
  }, [value]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextDisplay = formatWithDots(event.target.value);
    setDisplayValue(nextDisplay);

    if (nextDisplay.length === 0) {
      onChange('');
      return;
    }

    if (isValidDate(nextDisplay)) {
      onChange(toIso(nextDisplay));
    }
  };

  const handleBlur = () => {
    if (displayValue && !isValidDate(displayValue)) {
      setDisplayValue('');
      onChange('');
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder || 'DD.MM.YYYY'}
      className={className}
      required={required}
      disabled={disabled}
      name={name}
      autoComplete="off"
    />
  );
};

export default DateInput;
