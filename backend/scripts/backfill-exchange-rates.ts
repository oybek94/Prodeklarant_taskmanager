import { PrismaClient, Currency } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { getExchangeRate, convertToUzs } from '../src/services/exchange-rate';

const prisma = new PrismaClient();

/**
 * Backfill exchange rates and converted UZS amounts for all financial records
 */
async function backfillExchangeRates() {
  console.log('Starting exchange rate backfill...');

  try {
    // 1. Backfill Transactions
    console.log('Backfilling Transactions...');
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { exchangeRate: null },
          { convertedUzsAmount: null },
          { originalAmount: null },
        ],
      },
    });

    for (const transaction of transactions) {
      const originalAmount = transaction.originalAmount || transaction.amount;
      const originalCurrency = transaction.originalCurrency || transaction.currency;
      const date = transaction.date;

      try {
        // Get exchange rate for transaction date
        const exchangeRate = await getExchangeRate(date, originalCurrency, 'UZS', prisma);
        
        // Calculate converted UZS amount
        const convertedUzsAmount = convertToUzs(originalAmount, originalCurrency, exchangeRate);

        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            originalAmount,
            originalCurrency,
            exchangeRate,
            convertedUzsAmount,
          },
        });

        console.log(`  ✓ Transaction ${transaction.id}: ${originalAmount} ${originalCurrency} @ ${exchangeRate} = ${convertedUzsAmount} UZS`);
      } catch (error) {
        console.error(`  ✗ Transaction ${transaction.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 2. Backfill Clients
    console.log('\nBackfilling Clients...');
    const clients = await prisma.client.findMany({
      where: {
        dealAmount: { not: null },
        OR: [
          { dealAmountExchangeRate: null },
          { dealAmountInUzs: null },
        ],
      },
    });

    for (const client of clients) {
      if (!client.dealAmount || !client.dealAmountCurrency) continue;

      try {
        // Use client creation date for exchange rate
        const date = client.createdAt;
        const exchangeRate = await getExchangeRate(date, client.dealAmountCurrency, 'UZS', prisma);
        const convertedUzsAmount = convertToUzs(client.dealAmount, client.dealAmountCurrency, exchangeRate);

        await prisma.client.update({
          where: { id: client.id },
          data: {
            dealAmountExchangeRate: exchangeRate,
            dealAmountInUzs: convertedUzsAmount,
          },
        });

        console.log(`  ✓ Client ${client.id}: ${client.dealAmount} ${client.dealAmountCurrency} @ ${exchangeRate} = ${convertedUzsAmount} UZS`);
      } catch (error) {
        console.error(`  ✗ Client ${client.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 3. Backfill Tasks (snapshot exchange rates)
    console.log('\nBackfilling Tasks...');
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { snapshotDealAmountExchangeRate: null },
          { snapshotCertificatePaymentExchangeRate: null },
        ],
      },
    });

    for (const task of tasks) {
      const taskCreatedAt = task.createdAt;

      try {
        // Deal amount exchange rate (if client has deal amount in USD)
        if (task.snapshotDealAmount) {
          const client = await prisma.client.findUnique({
            where: { id: task.clientId },
            select: { dealAmountCurrency: true },
          });

          if (client?.dealAmountCurrency && client.dealAmountCurrency === 'USD') {
            const exchangeRate = await getExchangeRate(taskCreatedAt, 'USD', 'UZS', prisma);
            await prisma.task.update({
              where: { id: task.id },
              data: { snapshotDealAmountExchangeRate: exchangeRate },
            });
          } else {
            // UZS or null - rate is 1
            await prisma.task.update({
              where: { id: task.id },
              data: { snapshotDealAmountExchangeRate: new Decimal(1) },
            });
          }
        }

        // State payment rates are always UZS (rate = 1)
        const oneRate = new Decimal(1);
        await prisma.task.update({
          where: { id: task.id },
          data: {
            snapshotCertificatePaymentExchangeRate: oneRate,
            snapshotPsrPriceExchangeRate: oneRate,
            snapshotWorkerPriceExchangeRate: oneRate,
            snapshotCustomsPaymentExchangeRate: oneRate,
          },
        });

        console.log(`  ✓ Task ${task.id}: Snapshot exchange rates updated`);
      } catch (error) {
        console.error(`  ✗ Task ${task.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 4. Backfill KpiLogs
    console.log('\nBackfilling KpiLogs...');
    const kpiLogs = await prisma.kpiLog.findMany({
      where: {
        OR: [
          { exchangeRate: null },
          { convertedUzsAmount: null },
          { currency: null },
        ],
      },
    });

    for (const log of kpiLogs) {
      // KPI logs are in USD by default
      const currency: Currency = log.currency || 'USD';
      const date = log.createdAt;

      try {
        const exchangeRate = await getExchangeRate(date, currency, 'UZS', prisma);
        const convertedUzsAmount = convertToUzs(log.amount, currency, exchangeRate);

        await prisma.kpiLog.update({
          where: { id: log.id },
          data: {
            currency,
            exchangeRate,
            convertedUzsAmount,
          },
        });

        console.log(`  ✓ KpiLog ${log.id}: ${log.amount} ${currency} @ ${exchangeRate} = ${convertedUzsAmount} UZS`);
      } catch (error) {
        console.error(`  ✗ KpiLog ${log.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 5. Backfill TaskErrors
    console.log('\nBackfilling TaskErrors...');
    const taskErrors = await prisma.taskError.findMany({
      where: {
        OR: [
          { exchangeRate: null },
          { convertedUzsAmount: null },
          { currency: null },
        ],
      },
    });

    for (const error of taskErrors) {
      const currency: Currency = error.currency || 'USD';
      const date = error.date;

      try {
        const exchangeRate = await getExchangeRate(date, currency, 'UZS', prisma);
        const convertedUzsAmount = convertToUzs(error.amount, currency, exchangeRate);

        await prisma.taskError.update({
          where: { id: error.id },
          data: {
            currency,
            exchangeRate,
            convertedUzsAmount,
          },
        });

        console.log(`  ✓ TaskError ${error.id}: ${error.amount} ${currency} @ ${exchangeRate} = ${convertedUzsAmount} UZS`);
      } catch (error) {
        console.error(`  ✗ TaskError ${error.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 6. Backfill Debts
    console.log('\nBackfilling Debts...');
    const debts = await prisma.debt.findMany({
      where: {
        OR: [
          { exchangeRate: null },
          { convertedUzsAmount: null },
          { originalAmount: null },
        ],
      },
    });

    for (const debt of debts) {
      const originalAmount = debt.originalAmount || debt.amount;
      const originalCurrency = debt.originalCurrency || debt.currency;
      const date = debt.date;

      try {
        const exchangeRate = await getExchangeRate(date, originalCurrency, 'UZS', prisma);
        const convertedUzsAmount = convertToUzs(originalAmount, originalCurrency, exchangeRate);

        await prisma.debt.update({
          where: { id: debt.id },
          data: {
            originalAmount,
            originalCurrency,
            exchangeRate,
            convertedUzsAmount,
          },
        });

        console.log(`  ✓ Debt ${debt.id}: ${originalAmount} ${originalCurrency} @ ${exchangeRate} = ${convertedUzsAmount} UZS`);
      } catch (error) {
        console.error(`  ✗ Debt ${debt.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 7. Backfill PreviousYearWorkerDebts
    console.log('\nBackfilling PreviousYearWorkerDebts...');
    const previousYearDebts = await prisma.previousYearWorkerDebt.findMany({
      where: {
        OR: [
          { exchangeRate: null },
          { totalEarnedInUzs: null },
          { totalPaidInUzs: null },
          { balanceInUzs: null },
        ],
      },
    });

    for (const debt of previousYearDebts) {
      const currency = debt.currency;
      // Use year start date for exchange rate
      const date = new Date(debt.year, 0, 1);

      try {
        const exchangeRate = await getExchangeRate(date, currency, 'UZS', prisma);
        const totalEarnedInUzs = convertToUzs(debt.totalEarned, currency, exchangeRate);
        const totalPaidInUzs = convertToUzs(debt.totalPaid, currency, exchangeRate);
        const balanceInUzs = convertToUzs(debt.balance, currency, exchangeRate);

        await prisma.previousYearWorkerDebt.update({
          where: { id: debt.id },
          data: {
            exchangeRate,
            totalEarnedInUzs,
            totalPaidInUzs,
            balanceInUzs,
          },
        });

        console.log(`  ✓ PreviousYearWorkerDebt ${debt.id}: ${debt.balance} ${currency} @ ${exchangeRate} = ${balanceInUzs} UZS`);
      } catch (error) {
        console.error(`  ✗ PreviousYearWorkerDebt ${debt.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 8. Backfill Invoices
    console.log('\nBackfilling Invoices...');
    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { exchangeRate: null },
          { convertedUzsAmount: null },
        ],
      },
    });

    for (const invoice of invoices) {
      const currency = invoice.currency;
      const date = invoice.date;

      try {
        const exchangeRate = await getExchangeRate(date, currency, 'UZS', prisma);
        const convertedUzsAmount = convertToUzs(invoice.totalAmount, currency, exchangeRate);

        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            exchangeRate,
            convertedUzsAmount,
          },
        });

        console.log(`  ✓ Invoice ${invoice.id}: ${invoice.totalAmount} ${currency} @ ${exchangeRate} = ${convertedUzsAmount} UZS`);
      } catch (error) {
        console.error(`  ✗ Invoice ${invoice.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('\n✓ Exchange rate backfill completed!');
  } catch (error) {
    console.error('Error during backfill:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  backfillExchangeRates()
    .then(() => {
      console.log('Backfill script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Backfill script failed:', error);
      process.exit(1);
    });
}

export { backfillExchangeRates };

