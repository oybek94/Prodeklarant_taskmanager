/**
 * Jadval sarlavhalarining HAQIQIY (chiziladigan) ruscha matni.
 *
 * `columnLabels` dagi qiymatlar to'g'ridan-to'g'ri chizilmaydi: "Сумма" ustuni
 * valyutaga qarab ("Общая сумма в Долл. США"), "Цена" ustuni esa yagona o'lchov
 * birligiga qarab ("Цена за коробку") o'zgaradi. Inglizcha PDF sarlavhalarni AI
 * tarjimasidan oladi, tarjima esa aynan shu matnlar bo'yicha so'raladi — shuning
 * uchun hisob BIR joyda bo'lishi shart (aks holda kalit topilmay ruscha
 * sarlavha chiqib qolardi).
 */

export const buildEffectiveColumnLabels = (
  items: { unit?: string }[],
  columnLabels: Record<string, string>,
  totalColumnLabel: string,
): Record<string, string> => {
  const uniqueUnits = Array.from(new Set(items.map((i) => i.unit).filter(Boolean)));

  let unitPriceLabel = columnLabels.unitPrice || 'Цена за ед.изм.';
  if (uniqueUnits.length === 1) {
    const u = uniqueUnits[0];
    if (u === 'кор.' || u === 'кор') unitPriceLabel = 'Цена за коробку';
    else if (u === 'упак.' || u === 'упак') unitPriceLabel = 'Цена за упаковку';
    else if (u === 'шт.' || u === 'шт') unitPriceLabel = 'Цена за шт.';
    else unitPriceLabel = `Цена за ${u}`;
  }

  return {
    ...columnLabels,
    unitPrice: unitPriceLabel,
    total: totalColumnLabel,
    shtCount: 'шт',
  };
};
