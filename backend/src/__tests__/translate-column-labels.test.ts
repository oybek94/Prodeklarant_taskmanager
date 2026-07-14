import { describe, it, expect } from 'vitest';
import { buildTranslatableTexts } from '../services/translate.service';

describe('buildTranslatableTexts — col_* labels', () => {
  it('custom unitPrice label va EUR total label', () => {
    const texts = buildTranslatableTexts({
      contract: { contractCurrency: 'EUR' },
      additionalInfo: { columnLabels: { unitPrice: 'Цена за кг' } },
    });
    expect(texts.col_unitPrice).toBe('Цена за кг');
    expect(texts.col_total).toBe('Общая сумма в Евро');
    expect(texts.col_name).toBe('Наименование товара'); // default
  });

  it('valyutasiz: total default USD label', () => {
    const texts = buildTranslatableTexts({ additionalInfo: {} });
    expect(texts.col_total).toBe('Общая сумма в Долл. США');
  });

  it('RUB total label', () => {
    const texts = buildTranslatableTexts({
      contract: { contractCurrency: 'RUB' },
      additionalInfo: {},
    });
    expect(texts.col_total).toBe('Общая сумма Рубли РФ');
  });

  it('additionalInfo yo\'q bo\'lsa col_* qo\'shilmaydi', () => {
    const texts = buildTranslatableTexts({ contract: { sellerName: 'ООО Тест' } });
    expect(texts.col_total).toBeUndefined();
  });
});
