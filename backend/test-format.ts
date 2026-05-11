const formatMoney = (amount: any) => {
  const num = Number(amount);
  if (isNaN(num)) return String(amount);
  return num.toLocaleString('ru-RU').replace(/\u00A0/g, ' ');
};

console.log(formatMoney(1120000));
console.log(formatMoney('1120000'));
console.log(formatMoney(1120000.5));
