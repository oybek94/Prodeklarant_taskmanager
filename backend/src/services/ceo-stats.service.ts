import { prisma } from '../prisma';
import { getLatestExchangeRate } from './exchange-rate';
import { shouldDeductGovernmentFees } from './contract-payment-split';
import { psrIn } from './task-money';
import { computeClientDebt, debtClientSelect, debtPaymentSelect, debtTaskSelect, loadUsdRateAt } from './client-debt';

/**
 * Moliya sahifasi (GET /finance/ceo-stats): tushum, xarajat, kassa, debitorlik,
 * virtual kartalar. Hamma summalar so'mda, USD — joriy kurs bilan.
 */
export async function getCeoStats() {
  const usdToUzsRate = Number(await getLatestExchangeRate('USD', 'UZS'));

  const virtualCardTransactions = await prisma.transaction.findMany({
    where: { virtualCardId: { not: null } }
  });

  const cardBalances: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const tx of virtualCardTransactions) {
    if (tx.virtualCardId && tx.virtualCardId >= 1 && tx.virtualCardId <= 4) {
      let txAmount = 0;
      if (tx.amount_uzs) {
        txAmount = Number(tx.amount_uzs);
      } else if (tx.convertedUzsAmount) {
        txAmount = Number(tx.convertedUzsAmount);
      } else {
        txAmount = tx.currency === 'USD' ? Number(tx.amount) * usdToUzsRate : Number(tx.amount);
      }

      if (tx.type === 'INCOME') {
        cardBalances[tx.virtualCardId] += txAmount;
      } else if (tx.type === 'EXPENSE' || tx.type === 'SALARY') {
        cardBalances[tx.virtualCardId] -= txAmount;
      }
    }
  }

  const virtualCards = [
    { id: 1, name: 'Operatsion xarajatlar', description: 'Ishchi va Sertifikatchilarning ulushi', perTask: 400000, total: cardBalances[1] },
    { id: 2, name: 'Jamg\'arma', description: 'Qarzlarni berkitish uchun', perTask: 450000, total: cardBalances[2] },
    { id: 3, name: 'Korxona xarajatlari', description: 'Korxonani ishlab turishi uchun', perTask: 170000, total: cardBalances[3] },
    { id: 4, name: 'Maosh kartam', description: 'Shaxsiy maosh', perTask: 100000, total: cardBalances[4] },
  ];

  // 1. Jami tushum (Barcha bajarilgan ishlarning shartnoma summasi bo'yicha)
  const completedTasks = await prisma.task.findMany({
    where: {
      status: { notIn: ['BOSHLANMAGAN', 'JARAYONDA'] }
    },
    include: {
      client: { select: { id: true, name: true, dealAmount: true, dealAmountCurrency: true, dealAmount_currency: true, contractPaymentType: true } }
    }
  });

  const statePayments = await prisma.statePayment.findMany({ orderBy: { createdAt: 'asc' } });
  let certConfigs: any[] = [];
  if ('certifierFeeConfig' in prisma) {
      certConfigs = await (prisma as any).certifierFeeConfig.findMany({ orderBy: { createdAt: 'asc' } });
  }

  let totalRevenueUzs = 0;
  let totalExpensesUzs = 0;

  const clientRevenueMap = new Map<number, { name: string, total: number }>();
  const monthlyProfitMap = new Map<string, { month: string, revenue: number, expenses: number }>();
  
  for(let i=5; i>=0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyProfitMap.set(mStr, { month: mStr, revenue: 0, expenses: 0 });
  }

  for (const task of completedTasks) {
      const defaultDeal = Number(task.client.dealAmount || 0);
      const baseAmount = task.snapshotDealAmount != null ? Number(task.snapshotDealAmount) : defaultDeal;
      const currency = task.snapshotDealAmount_currency || task.client.dealAmount_currency || task.client.dealAmountCurrency || 'USD';
      // PSR so'mda saqlanishi mumkin — shartnoma valyutasiga o'giriladi
      const psrAmount = psrIn(task, currency, currency);

      const totalTaskAmount = baseAmount + psrAmount;

      const totalTaskAmountUzs = currency === 'USD' ? totalTaskAmount * usdToUzsRate : totalTaskAmount;
      totalRevenueUzs += totalTaskAmountUzs;

      // Group by client
      const clientRev = clientRevenueMap.get(task.clientId) || { name: task.client.name, total: 0 };
      clientRev.total += totalTaskAmountUzs;
      clientRevenueMap.set(task.clientId, clientRev);

      // Harajat (Expenses) hisoblash (har bir ish uchun)
      let sp = statePayments.length > 0 ? statePayments[0] : null;
      for (const s of statePayments) {
          if (s.createdAt <= task.createdAt) sp = s;
      }
      
      let cc = certConfigs.find((c: any) => c.branchId === task.branchId);
      for (const c of certConfigs) {
          if (c.branchId === task.branchId && c.createdAt <= task.createdAt) cc = c;
      }

      let taskExpenseUzs = 0;

      const contractPaymentType = task.snapshotContractPaymentType || task.client.contractPaymentType || 'CASH_ALL_INCLUSIVE';
      const deductGovernmentFees = shouldDeductGovernmentFees(contractPaymentType);

      // Davlat tolovlari: ST-1, FITO, Fumigatsiya, Ichki sertifikat
      // (faqat CASH_ALL_INCLUSIVE turida — boshqalarida mijoz o'zi to'laydi)
      if (deductGovernmentFees) {
        const davlatUz = Number(sp?.st1Payment || 0) + Number(sp?.fitoPayment || 0) + Number(sp?.fumigationPayment || 0) + Number(sp?.internalCertPayment || 0);
        if (sp?.currency === 'USD') taskExpenseUzs += davlatUz * usdToUzsRate;
        else taskExpenseUzs += davlatUz;

        // Bojxona tolovi:
        const customs = task.snapshotCustomsPayment != null ? Number(task.snapshotCustomsPayment) : Number(sp?.customsPayment || 0);
        const customsCurrency = task.snapshotCustomsPayment_currency || sp?.currency || 'UZS';
        if (customsCurrency === 'USD') taskExpenseUzs += customs * usdToUzsRate;
        else taskExpenseUzs += customs;
      }

      // Ishchilarga to'lovlar:
      const worker = task.snapshotWorkerPrice != null ? Number(task.snapshotWorkerPrice) : Number(sp?.workerPrice || 0);
      const workerCurrency = task.snapshotWorkerPrice_currency || sp?.currency || 'UZS';
      if (workerCurrency === 'USD') taskExpenseUzs += worker * usdToUzsRate;
      else taskExpenseUzs += worker;

      // Sertifikatchi tariflari:
      const certifierUzs = Number(cc?.st1Rate || 0) + Number(cc?.fitoRate || 0) + Number(cc?.aktRate || 0);
      taskExpenseUzs += certifierUzs;

      // Add to total
      totalExpensesUzs += taskExpenseUzs;

      // Add to monthly profit
      const mStr = `${task.createdAt.getFullYear()}-${String(task.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyProfitMap.has(mStr)) {
          const mp = monthlyProfitMap.get(mStr)!;
          mp.revenue += totalTaskAmountUzs;
          mp.expenses += taskExpenseUzs;
      }
  }

  const topClientsByRevenue = Array.from(clientRevenueMap.values())
      .sort((a,b) => b.total - a.total)
      .slice(0, 5);
  
  const profitDynamics = Array.from(monthlyProfitMap.values());

  // 3. Cash (Hisobdagi pul)
  // Transaksiyaga yozilgan jami INCOME - SALARY - EXPENSE.
  const allTransactions = await prisma.transaction.findMany({
    where: {
      type: { in: ['INCOME', 'EXPENSE', 'SALARY'] }
    }
  });

  let cashUsd = 0;
  let cashUzs = 0;
  let totalInflowUzs = 0;
  let totalOutflowUzs = 0;
  const expenseBreakdown = {
     "Ish haqi": 0,
     "Ofis xarajatlari": 0,
     "Transport": 0,
     "Soliq": 0,
     "Boshqa": 0,
  };

  for (const tx of allTransactions) {
    const amt = Number(tx.amount);
    let valueUzs = tx.currency === 'USD' ? amt * usdToUzsRate : amt;

    if (tx.type === 'INCOME') {
      if (tx.currency === 'USD') cashUsd += amt;
      else cashUzs += amt;
      totalInflowUzs += valueUzs;
    } else if (tx.type === 'EXPENSE' || tx.type === 'SALARY') {
      if (tx.currency === 'USD') cashUsd -= amt;
      else cashUzs -= amt;
      totalOutflowUzs += valueUzs;

      if (tx.type === 'SALARY') {
          expenseBreakdown["Ish haqi"] += valueUzs;
      } else {
          const cat = (tx.expenseCategory || '').toLowerCase();
          if (cat.includes('ofis') || cat.includes('office')) expenseBreakdown["Ofis xarajatlari"] += valueUzs;
          else if (cat.includes('transport') || cat.includes('yo\'l') || cat.includes('yol') || cat.includes('benzin') || cat.includes('avto')) expenseBreakdown["Transport"] += valueUzs;
          else if (cat.includes('soliq') || cat.includes('tax') || cat.includes('nds') || cat.includes('qts')) expenseBreakdown["Soliq"] += valueUzs;
          else expenseBreakdown["Boshqa"] += valueUzs;
      }
    }
  }
  const totalCashUzs = (cashUsd * usdToUzsRate) + cashUzs;
  
  // Convert breakdown to array
  const expensesByCategory = Object.entries(expenseBreakdown).map(([name, sum]) => ({ name, sum })).filter(e => e.sum > 0);

  // 4. Debitor qarzdorlik — yagona qoida: services/client-debt.ts
  const { rateAt } = await loadUsdRateAt();
  const allClients = await prisma.client.findMany({
    select: {
      ...debtClientSelect,
      tasks: { select: debtTaskSelect },
      transactions: { where: { type: 'INCOME' }, select: debtPaymentSelect },
    },
  });

  let totalDebtorsUzs = 0;
  let skippedPayments = 0;
  for (const client of allClients) {
    const { debt, currency, skipped } = computeClientDebt(client, rateAt, usdToUzsRate || null);
    skippedPayments += skipped;
    if (debt > 0) totalDebtorsUzs += currency === 'USD' ? debt * usdToUzsRate : debt;
  }
  if (skippedPayments > 0) {
    console.warn(`[ceo-stats] ${skippedPayments} ta to'lov kurs topilmagani uchun qarzdorlikka qo'shilmadi`);
  }

  return {
      revenue: totalRevenueUzs,
      expenses: totalExpensesUzs,
      cash: totalCashUzs,
      debtors: totalDebtorsUzs,
      topClientsByRevenue,
      expensesByCategory,
      profitDynamics,
      totalInflow: totalInflowUzs,
      totalOutflow: totalOutflowUzs,
      virtualCards
  };
}
