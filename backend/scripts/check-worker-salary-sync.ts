/**
 * SALARY transaksiyalari WorkerPayment yozuvlari bilan mos kelishini tekshiradi.
 *
 * Ishga tushirish:  npx tsx scripts/check-worker-salary-sync.ts
 *
 * Har bir SALARY transaksiya uchun unga mos WorkerPayment bor-yo'qligini ko'rsatadi
 * va har bir ishchining joriy qarz hisobini chiqaradi.
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { getWorkerPaymentReport } from '../src/services/worker-payment';

const prisma = new PrismaClient();

async function main() {
  const salaryTransactions = await prisma.transaction.findMany({
    where: { type: 'SALARY' },
    orderBy: { date: 'desc' },
    include: { worker: { select: { id: true, name: true, salaryCurrency: true } } },
  });

  console.log(`SALARY transaksiyalar: ${salaryTransactions.length}\n`);

  const orphans: number[] = [];

  for (const t of salaryTransactions) {
    const amount = t.originalAmount ?? t.amount;
    const currency = t.originalCurrency ?? t.currency;

    const where: Prisma.WorkerPaymentWhereInput = {
      workerId: t.workerId ?? -1,
      paidCurrency: currency,
    };
    if (currency === 'USD') {
      where.paidAmountUsd = { equals: amount };
    } else {
      where.paidAmountUzs = { equals: amount };
    }

    const match = await prisma.workerPayment.findFirst({ where });

    const date = t.date.toISOString().slice(0, 10);
    const who = t.worker?.name ?? `#${t.workerId}`;

    if (!match) {
      orphans.push(t.id);
      console.log(`  YO'Q  tx#${t.id}  ${date}  ${who}  ${amount} ${currency}  -> WorkerPayment topilmadi`);
      continue;
    }

    const salaryCurrency = t.worker?.salaryCurrency ?? 'UZS';
    const usable = salaryCurrency === 'UZS' ? match.paidAmountUzs : match.paidAmountUsd;
    const flag = usable == null || Number(usable) === 0 ? "BO'SH" : '  OK  ';
    console.log(
      `  ${flag}  tx#${t.id}  ${date}  ${who}  ${amount} ${currency}  -> wp#${match.id} ` +
        `(usd=${match.paidAmountUsd}, uzs=${match.paidAmountUzs}, oylik valyutasi=${salaryCurrency})`
    );
  }

  const workerIds = [...new Set(salaryTransactions.map((t) => t.workerId).filter((id): id is number => id !== null))];

  console.log('\nIshchilar bo\'yicha joriy qarz:');
  for (const workerId of workerIds) {
    try {
      const report = await getWorkerPaymentReport(workerId);
      const worker = salaryTransactions.find((t) => t.workerId === workerId)?.worker;
      console.log(
        `  ${worker?.name ?? `#${workerId}`} (${report.salaryCurrency}): ` +
          `ishlab topgan=${report.current.totalEarned.toFixed(2)}, ` +
          `to'langan=${report.current.totalPaid.toFixed(2)}, ` +
          `xatolar=${report.current.totalErrors.toFixed(2)}, ` +
          `qarz=${report.current.difference.toFixed(2)}`
      );
    } catch (e) {
      console.log(`  #${workerId}: hisobot olinmadi — ${e instanceof Error ? e.message : e}`);
    }
  }

  if (orphans.length > 0) {
    console.log(`\nWorkerPayment'siz transaksiyalar: ${orphans.join(', ')}`);
    console.log("Bularni Transaksiyalar bo'limida o'chirib, qaytadan kiritish kerak.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
