/**
 * 2026-06-06 dagi "standardize system currency to UZS" (44d840d) commitidan keyin
 * Transaksiyalar sahifasi so'mdagi summani `currency: 'USD'` bilan yuborib kelgan:
 * MonetaryInput UZS-only bo'lib qolgan, lekin formadagi `currency` state 'USD'da qolgan.
 * Natijada summa so'mda, valyuta esa USD bo'lib saqlangan va oylik to'lovlari
 * ishchining "Joriy qarz"idan ayrilmagan.
 *
 * Bu skript shunday yozuvlarni UZS'ga o'tkazadi. Summa o'zgarmaydi — faqat valyuta,
 * kurs va so'mdagi ekvivalent maydonlari to'g'rilanadi.
 *
 * Ko'rish (hech narsa o'zgartirmaydi):
 *   npx tsx scripts/fix-usd-transactions-to-uzs.ts
 * Qo'llash:
 *   npx tsx scripts/fix-usd-transactions-to-uzs.ts --apply
 * Sanani o'zgartirish:
 *   npx tsx scripts/fix-usd-transactions-to-uzs.ts --from=2026-06-06
 */
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_FROM = '2026-06-06';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const fromArg = args.find((a) => a.startsWith('--from='))?.split('=')[1] ?? DEFAULT_FROM;
const fromDate = new Date(`${fromArg}T00:00:00.000Z`);

function fmt(value: Prisma.Decimal | null): string {
  return value == null ? '-' : value.toFixed(2);
}

async function main() {
  if (Number.isNaN(fromDate.getTime())) {
    throw new Error(`Noto'g'ri sana: ${fromArg}`);
  }

  const broken = await prisma.transaction.findMany({
    where: {
      createdAt: { gte: fromDate },
      OR: [{ currency: 'USD' }, { originalCurrency: 'USD' }, { currency_universal: 'USD' }],
    },
    orderBy: { date: 'asc' },
    include: { worker: { select: { id: true, name: true } } },
  });

  console.log(`Rejim: ${apply ? 'QO\'LLASH' : "faqat ko'rsatish (--apply bermadingiz)"}`);
  console.log(`Sana: ${fromArg} dan keyin yaratilganlar`);
  console.log(`Topildi: ${broken.length} ta USD transaksiya\n`);

  if (broken.length === 0) return;

  // To'lov usuli bo'lgan yozuvlar balansga ta'sir qilgan — deltani hisoblab, ogohlantiramiz
  const balanceDelta = new Map<string, Prisma.Decimal>();

  for (const t of broken) {
    const amount = t.originalAmount ?? t.amount;
    const who = t.type === 'SALARY' ? (t.worker?.name ?? `#${t.workerId}`) : (t.expenseCategory ?? '');
    console.log(
      `  tx#${t.id}  ${t.date.toISOString().slice(0, 10)}  ${t.type.padEnd(7)} ` +
        `${fmt(amount).padStart(14)} USD -> UZS  ${who}` +
        (t.paymentMethod ? `  [${t.paymentMethod}]` : '')
    );

    if (t.paymentMethod) {
      const signed = t.type === 'INCOME' ? amount : amount.negated();
      const key = t.paymentMethod;
      balanceDelta.set(key, (balanceDelta.get(key) ?? new Prisma.Decimal(0)).plus(signed));
    }
  }

  console.log('\nBalansga ta\'siri (USD balansdan olinib, UZS balansga qo\'shilishi kerak):');
  for (const [method, delta] of balanceDelta) {
    console.log(`  ${method}: ${delta.toFixed(2)}`);
  }

  if (!apply) {
    console.log('\nRo\'yxatni tekshiring. Haqiqiy USD to\'lovlar bo\'lsa, --from= bilan sanani toraytiring.');
    console.log('O\'zgartirish uchun: npx tsx scripts/fix-usd-transactions-to-uzs.ts --apply');
    return;
  }

  let fixedTransactions = 0;
  let fixedPayments = 0;

  for (const t of broken) {
    const amount = t.originalAmount ?? t.amount;

    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id: t.id },
        data: {
          currency: 'UZS',
          originalCurrency: 'UZS',
          currency_universal: 'UZS',
          exchangeRate: new Prisma.Decimal(1),
          exchange_rate: new Prisma.Decimal(1),
          convertedUzsAmount: amount,
          amount_uzs: amount,
        },
      });
      fixedTransactions++;

      // SALARY bo'lsa, unga mos WorkerPayment ham USD deb saqlangan
      if (t.type === 'SALARY' && t.workerId) {
        const wp = await tx.workerPayment.findFirst({
          where: {
            workerId: t.workerId,
            paidCurrency: 'USD',
            paidAmountUsd: { equals: amount },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (wp) {
          // Summa aslida so'mda edi: uni paidAmountUzs ga ko'chiramiz.
          // paidAmountUsd endi haqiqiy USD ekvivalenti bo'ladi.
          const rate = t.exchange_rate ?? t.exchangeRate;
          const usdEquivalent =
            rate && !rate.isZero() ? amount.div(rate) : new Prisma.Decimal(0);

          await tx.workerPayment.update({
            where: { id: wp.id },
            data: {
              paidCurrency: 'UZS',
              paidAmountUzs: amount,
              paidAmountUsd: usdEquivalent,
              exchangeRate: rate ?? null,
              earnedAmountUsd: amount,
            },
          });
          fixedPayments++;
        } else {
          console.log(`  DIQQAT: tx#${t.id} uchun WorkerPayment topilmadi — qo'lda kiritish kerak`);
        }
      }
    });
  }

  console.log(`\nTuzatildi: ${fixedTransactions} ta transaksiya, ${fixedPayments} ta oylik yozuvi.`);
  console.log('AccountBalance yuqoridagi delta bo\'yicha qo\'lda to\'g\'rilanishi kerak.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
