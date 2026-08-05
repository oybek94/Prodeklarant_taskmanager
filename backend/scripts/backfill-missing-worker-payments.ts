/**
 * SALARY transaksiyasi bor, lekin unga mos WorkerPayment yozuvi yo'q bo'lgan
 * holatlarni topadi va yetishmayotgan yozuvni yaratadi.
 *
 * Bunday holat POST /transactions dagi createWorkerPayment xatosi jimgina
 * yutilgani sababli yuzaga kelgan: transaksiya saqlangan, oylik yozuvi esa yo'q,
 * natijada ishchining "Joriy qarz"i kamaymagan.
 *
 * Ko'rish:
 *   npx tsx scripts/backfill-missing-worker-payments.ts
 * Qo'llash (faqat tanlangan transaksiyalar uchun):
 *   npx tsx scripts/backfill-missing-worker-payments.ts --ids=616,617,618 --apply
 *
 * DIQQAT: valyutasi USD bo'lgan transaksiyani tanlashdan oldin o'ylang —
 * yaratilgan yozuv summani kursga ko'paytirib so'mda hisoblaydi.
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { createWorkerPayment } from '../src/services/worker-payment';

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const idsArg = args.find((a) => a.startsWith('--ids='))?.split('=')[1];
const ids = idsArg
  ? idsArg.split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0)
  : null;

async function main() {
  if (idsArg && (!ids || ids.length === 0)) {
    throw new Error(`Noto'g'ri --ids qiymati: ${idsArg}`);
  }
  if (apply && !ids) {
    throw new Error(
      "--apply faqat --ids bilan ishlaydi. Avval ro'yxatni ko'ring, keyin ID'larni sanang."
    );
  }

  const salaries = await prisma.transaction.findMany({
    where: { type: 'SALARY', workerId: { not: null }, ...(ids ? { id: { in: ids } } : {}) },
    orderBy: { date: 'asc' },
    include: { worker: { select: { id: true, name: true, salaryCurrency: true } } },
  });

  const missing: typeof salaries = [];

  for (const t of salaries) {
    const amount = t.originalAmount ?? t.amount;
    const currency = t.originalCurrency ?? t.currency;

    const where: Prisma.WorkerPaymentWhereInput = {
      workerId: t.workerId!,
      paidCurrency: currency,
    };
    if (currency === 'USD') {
      where.paidAmountUsd = { equals: amount };
    } else {
      where.paidAmountUzs = { equals: amount };
    }

    const found = await prisma.workerPayment.findFirst({ where });
    if (!found) missing.push(t);
  }

  console.log(`Rejim: ${apply ? "QO'LLASH" : "faqat ko'rsatish"}`);
  console.log(`Tekshirildi: ${salaries.length} ta SALARY transaksiya`);
  console.log(`WorkerPayment'siz: ${missing.length} ta\n`);

  for (const t of missing) {
    const amount = t.originalAmount ?? t.amount;
    const currency = t.originalCurrency ?? t.currency;
    console.log(
      `  tx#${t.id}  ${t.date.toISOString().slice(0, 10)}  ${t.worker?.name}  ` +
        `${amount.toFixed(2)} ${currency}` +
        (currency === 'USD' ? '   <-- USD! kursga ko\'paytiriladi' : '')
    );
  }

  if (!apply) {
    console.log('\nYaratish uchun: npx tsx scripts/backfill-missing-worker-payments.ts --ids=<...> --apply');
    return;
  }

  let created = 0;
  for (const t of missing) {
    const amount = t.originalAmount ?? t.amount;
    const currency = t.originalCurrency ?? t.currency;

    await createWorkerPayment(t.workerId!, currency, amount, {
      paymentDate: t.date,
      comment: t.comment || undefined,
      isLegacyPayment: false,
    });
    created++;
    console.log(`  yaratildi: tx#${t.id} -> ${t.worker?.name} ${amount.toFixed(2)} ${currency}`);
  }

  console.log(`\nYaratildi: ${created} ta oylik yozuvi.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
