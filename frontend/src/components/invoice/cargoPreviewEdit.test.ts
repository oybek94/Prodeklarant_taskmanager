import { describe, expect, it } from 'vitest';
import { parseEditedNumber, validateEditedValue } from './useCargoImport';
import type { CargoPreviewRow } from './useCargoImport';

const row = (input: CargoPreviewRow['input']): CargoPreviewRow => ({
  key: 'k',
  label: 'L',
  newValue: '',
  currentValue: '',
  input,
});

describe('parseEditedNumber', () => {
  it('probel va vergulni hisobga oladi', () => {
    expect(parseEditedNumber('19 170')).toBe(19170);
    expect(parseEditedNumber('5,25')).toBe(5.25);
    expect(parseEditedNumber(' 1.2 ')).toBe(1.2);
  });

  it('son bo\'lmasa null', () => {
    expect(parseEditedNumber('')).toBeNull();
    expect(parseEditedNumber('12кг')).toBeNull();
  });
});

describe('validateEditedValue', () => {
  it('bo\'sh qiymatni rad etadi', () => {
    expect(validateEditedValue(row('text'), '  ')).not.toBeNull();
  });

  it('turiga qarab tekshiradi', () => {
    expect(validateEditedValue(row('number'), '3 648')).toBeNull();
    expect(validateEditedValue(row('number'), 'abc')).not.toBeNull();
    expect(validateEditedValue(row('date'), '2026-09-16')).toBeNull();
    expect(validateEditedValue(row('date'), '16.09.2026')).not.toBeNull();
    expect(validateEditedValue(row('currency'), 'UZS')).toBeNull();
    expect(validateEditedValue(row('currency'), 'EUR')).not.toBeNull();
    expect(validateEditedValue(row('text'), 'Виноград Тайфи свежий')).toBeNull();
  });
});
