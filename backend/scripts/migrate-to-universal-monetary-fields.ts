import { PrismaClient, Currency, ExchangeSource } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { getExchangeRate } from '../src/services/exchange-rate';
import { calculateAmountUzs } from '../src/services/monetary-validation';

const prisma = new PrismaClient();

/**
 * Migrate existing financial records to universal monetary fields
 */
async function migrateToUniversalMonetaryFields() {
  console.log('Starting migration to universal monetary fields...');

  try {
    // 1. Migrate Transactions
    console.log('\nMigrating Transactions...');
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { amount_original: null },
          { amount_uzs: null },
        ],
      },
    });

    for (const tx of transactions) {
      const originalAmount = tx.amount_original || tx.originalAmount || tx.amount;
      const originalCurrency = tx.currency_universal || tx.originalCurrency || tx.currency;
      const exchangeRate = tx.exchange_rate || tx.exchangeRate;
      const convertedUzsAmount = tx.amount_uzs || tx.convertedUzsAmount;
      const date = tx.date;

      if (!originalAmount || !originalCurrency) continue;

      try {
        let finalExchangeRate = exchangeRate;
        if (!finalExchangeRate) {
          finalExchangeRate = await getExchangeRate(date, originalCurrency, 'UZS', prisma);
        }

        const finalAmountUzs = convertedUzsAmount || calculateAmountUzs(originalAmount, originalCurrency, finalExchangeRate);

        await prisma.transaction.update({
          where: { id: tx.id },
          data: {
            amount_original: originalAmount,
            currency_universal: originalCurrency,
            exchange_rate: finalExchangeRate,
            amount_uzs: finalAmountUzs,
            exchange_source: 'CBU' as ExchangeSource,
          },
        });

        console.log(`  ✓ Transaction ${tx.id}: ${originalAmount} ${originalCurrency} @ ${finalExchangeRate} = ${finalAmountUzs} UZS`);
      } catch (error) {
        console.error(`  ✗ Transaction ${tx.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 2. Migrate Clients
    console.log('\nMigrating Clients...');
    const clients = await prisma.client.findMany({
      where: {
        dealAmount: { not: null },
        OR: [
          { dealAmount_amount_original: null },
          { dealAmount_amount_uzs: null },
        ],
      },
    });

    for (const client of clients) {
      if (!client.dealAmount || !client.dealAmountCurrency) continue;

      try {
        const originalAmount = client.dealAmount;
        const originalCurrency = client.dealAmountCurrency;
        const exchangeRate = client.dealAmount_exchange_rate || client.dealAmountExchangeRate;
        const convertedUzsAmount = client.dealAmount_amount_uzs || client.dealAmountInUzs;
        const date = client.createdAt;

        let finalExchangeRate = exchangeRate;
        if (!finalExchangeRate) {
          finalExchangeRate = await getExchangeRate(date, originalCurrency, 'UZS', prisma);
        }

        const finalAmountUzs = convertedUzsAmount || calculateAmountUzs(originalAmount, originalCurrency, finalExchangeRate);

        await prisma.client.update({
          where: { id: client.id },
          data: {
            dealAmount_amount_original: originalAmount,
            dealAmount_currency: originalCurrency,
            dealAmount_exchange_rate: finalExchangeRate,
            dealAmount_amount_uzs: finalAmountUzs,
            dealAmount_exchange_source: 'CBU' as ExchangeSource,
          },
        });

        console.log(`  ✓ Client ${client.id}: ${originalAmount} ${originalCurrency} @ ${finalExchangeRate} = ${finalAmountUzs} UZS`);
      } catch (error) {
        console.error(`  ✗ Client ${client.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 3. Migrate KpiLogs
    console.log('\nMigrating KpiLogs...');
    const kpiLogs = await prisma.kpiLog.findMany({
      where: {
        OR: [
          { amount_original: null },
          { amount_uzs: null },
        ],
      },
    });

    for (const log of kpiLogs) {
      const currency: Currency = log.currency_universal || log.currency || 'USD';
      const date = log.createdAt;

      try {
        const originalAmount = log.amount_original || log.amount;
        const exchangeRate = log.exchange_rate || log.exchangeRate;
        const convertedUzsAmount = log.amount_uzs || log.convertedUzsAmount;

        let finalExchangeRate = exchangeRate;
        if (!finalExchangeRate) {
          finalExchangeRate = await getExchangeRate(date, currency, 'UZS', prisma);
        }

        const finalAmountUzs = convertedUzsAmount || calculateAmountUzs(originalAmount, currency, finalExchangeRate);

        await prisma.kpiLog.update({
          where: { id: log.id },
          data: {
            amount_original: originalAmount,
            currency_universal: currency,
            exchange_rate: finalExchangeRate,
            amount_uzs: finalAmountUzs,
            exchange_source: 'CBU' as ExchangeSource,
          },
        });

        console.log(`  ✓ KpiLog ${log.id}: ${originalAmount} ${currency} @ ${finalExchangeRate} = ${finalAmountUzs} UZS`);
      } catch (error) {
        console.error(`  ✗ KpiLog ${log.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 4. Migrate TaskErrors
    console.log('\nMigrating TaskErrors...');
    const taskErrors = await prisma.taskError.findMany({
      where: {
        OR: [
          { amount_original: null },
          { amount_uzs: null },
        ],
      },
    });

    for (const error of taskErrors) {
      const currency: Currency = error.currency_universal || error.currency || 'USD';
      const date = error.date;

      try {
        const originalAmount = error.amount_original || error.amount;
        const exchangeRate = error.exchange_rate || error.exchangeRate;
        const convertedUzsAmount = error.amount_uzs || error.convertedUzsAmount;

        let finalExchangeRate = exchangeRate;
        if (!finalExchangeRate) {
          finalExchangeRate = await getExchangeRate(date, currency, 'UZS', prisma);
        }

        const finalAmountUzs = convertedUzsAmount || calculateAmountUzs(originalAmount, currency, finalExchangeRate);

        await prisma.taskError.update({
          where: { id: error.id },
          data: {
            amount_original: originalAmount,
            currency_universal: currency,
            exchange_rate: finalExchangeRate,
            amount_uzs: finalAmountUzs,
            exchange_source: 'CBU' as ExchangeSource,
          },
        });

        console.log(`  ✓ TaskError ${error.id}: ${originalAmount} ${currency} @ ${finalExchangeRate} = ${finalAmountUzs} UZS`);
      } catch (error) {
        console.error(`  ✗ TaskError ${error.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 5. Migrate Debts
    console.log('\nMigrating Debts...');
    const debts = await prisma.debt.findMany({
      where: {
        OR: [
          { amount_original: null },
          { amount_uzs: null },
        ],
      },
    });

    for (const debt of debts) {
      const originalAmount = debt.amount_original || debt.originalAmount || debt.amount;
      const originalCurrency = debt.currency_universal || debt.originalCurrency || debt.currency;
      const date = debt.date;

      if (!originalAmount || !originalCurrency) continue;

      try {
        const exchangeRate = debt.exchange_rate || debt.exchangeRate;
        const convertedUzsAmount = debt.amount_uzs || debt.convertedUzsAmount;

        let finalExchangeRate = exchangeRate;
        if (!finalExchangeRate) {
          finalExchangeRate = await getExchangeRate(date, originalCurrency, 'UZS', prisma);
        }

        const finalAmountUzs = convertedUzsAmount || calculateAmountUzs(originalAmount, originalCurrency, finalExchangeRate);

        await prisma.debt.update({
          where: { id: debt.id },
          data: {
            amount_original: originalAmount,
            currency_universal: originalCurrency,
            exchange_rate: finalExchangeRate,
            amount_uzs: finalAmountUzs,
            exchange_source: 'CBU' as ExchangeSource,
          },
        });

        console.log(`  ✓ Debt ${debt.id}: ${originalAmount} ${originalCurrency} @ ${finalExchangeRate} = ${finalAmountUzs} UZS`);
      } catch (error) {
        console.error(`  ✗ Debt ${debt.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 6. Migrate PreviousYearWorkerDebts
    console.log('\nMigrating PreviousYearWorkerDebts...');
    const previousYearDebts = await prisma.previousYearWorkerDebt.findMany({
      where: {
        OR: [
          { totalEarned_amount_original: null },
          { totalEarned_amount_uzs: null },
        ],
      },
    });

    for (const debt of previousYearDebts) {
      const currency = debt.currency_universal || debt.currency;
      const date = new Date(debt.year, 0, 1); // Use year start date

      try {
        const exchangeRate = debt.exchange_rate;
        let finalExchangeRate = exchangeRate;
        if (!finalExchangeRate) {
          finalExchangeRate = await getExchangeRate(date, currency, 'UZS', prisma);
        }

        const totalEarned = debt.totalEarned_amount_original || debt.totalEarned;
        const totalPaid = debt.totalPaid_amount_original || debt.totalPaid;
        const balance = debt.balance_amount_original || debt.balance;

        const totalEarnedUzs = debt.totalEarned_amount_uzs || debt.totalEarnedInUzs || calculateAmountUzs(totalEarned, currency, finalExchangeRate);
        const totalPaidUzs = debt.totalPaid_amount_uzs || debt.totalPaidInUzs || calculateAmountUzs(totalPaid, currency, finalExchangeRate);
        const balanceUzs = debt.balance_amount_uzs || debt.balanceInUzs || calculateAmountUzs(balance, currency, finalExchangeRate);

        await prisma.previousYearWorkerDebt.update({
          where: { id: debt.id },
          data: {
            totalEarned_amount_original: totalEarned,
            totalPaid_amount_original: totalPaid,
            balance_amount_original: balance,
            currency_universal: currency,
            exchange_rate: finalExchangeRate,
            totalEarned_amount_uzs: totalEarnedUzs,
            totalPaid_amount_uzs: totalPaidUzs,
            balance_amount_uzs: balanceUzs,
            exchange_source: 'CBU' as ExchangeSource,
          },
        });

        console.log(`  ✓ PreviousYearWorkerDebt ${debt.id}: migrated`);
      } catch (error) {
        console.error(`  ✗ PreviousYearWorkerDebt ${debt.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 7. Migrate Invoices
    console.log('\nMigrating Invoices...');
    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { amount_original: null },
          { amount_uzs: null },
        ],
      },
    });

    for (const invoice of invoices) {
      const currency = invoice.currency_universal || invoice.currency;
      const date = invoice.date;

      try {
        const originalAmount = invoice.amount_original || invoice.totalAmount;
        const exchangeRate = invoice.exchange_rate || invoice.exchangeRate;
        const convertedUzsAmount = invoice.amount_uzs || invoice.convertedUzsAmount;

        let finalExchangeRate = exchangeRate;
        if (!finalExchangeRate) {
          finalExchangeRate = await getExchangeRate(date, currency, 'UZS', prisma);
        }

        const finalAmountUzs = convertedUzsAmount || calculateAmountUzs(originalAmount, currency, finalExchangeRate);

        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            amount_original: originalAmount,
            currency_universal: currency,
            exchange_rate: finalExchangeRate,
            amount_uzs: finalAmountUzs,
            exchange_source: 'CBU' as ExchangeSource,
          },
        });

        console.log(`  ✓ Invoice ${invoice.id}: ${originalAmount} ${currency} @ ${finalExchangeRate} = ${finalAmountUzs} UZS`);
      } catch (error) {
        console.error(`  ✗ Invoice ${invoice.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 8. Migrate Task snapshots
    console.log('\nMigrating Task snapshots...');
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { snapshotDealAmount_amount_original: null },
          { snapshotCertificatePayment_amount_original: null },
        ],
      },
    });

    for (const task of tasks) {
      const taskCreatedAt = task.createdAt;

      try {
        // Deal amount snapshot
        if (task.snapshotDealAmount && !task.snapshotDealAmount_amount_original) {
          const client = await prisma.client.findUnique({
            where: { id: task.clientId },
            select: { dealAmountCurrency: true },
          });

          const currency = client?.dealAmountCurrency || 'USD';
          let exchangeRate = task.snapshotDealAmount_exchange_rate || task.snapshotDealAmountExchangeRate;
          if (!exchangeRate && currency === 'USD') {
            exchangeRate = await getExchangeRate(taskCreatedAt, 'USD', 'UZS', prisma);
          } else if (!exchangeRate) {
            exchangeRate = new Decimal(1); // UZS
          }

          const amountUzs = calculateAmountUzs(task.snapshotDealAmount, currency, exchangeRate);

          await prisma.task.update({
            where: { id: task.id },
            data: {
              snapshotDealAmount_amount_original: task.snapshotDealAmount,
              snapshotDealAmount_currency: currency,
              snapshotDealAmount_exchange_rate: exchangeRate,
              snapshotDealAmount_amount_uzs: amountUzs,
              snapshotDealAmount_exchange_source: 'CBU' as ExchangeSource,
            },
          });
        }

        // State payment snapshots (always UZS, rate = 1)
        const oneRate = new Decimal(1);
        const uzsCurrency = 'UZS' as Currency;

        const updateData: any = {};

        if (task.snapshotCertificatePayment && !task.snapshotCertificatePayment_amount_original) {
          updateData.snapshotCertificatePayment_amount_original = task.snapshotCertificatePayment;
          updateData.snapshotCertificatePayment_currency = uzsCurrency;
          updateData.snapshotCertificatePayment_exchange_rate = oneRate;
          updateData.snapshotCertificatePayment_amount_uzs = task.snapshotCertificatePayment;
          updateData.snapshotCertificatePayment_exchange_source = 'CBU' as ExchangeSource;
        }

        if (task.snapshotPsrPrice && !task.snapshotPsrPrice_amount_original) {
          updateData.snapshotPsrPrice_amount_original = task.snapshotPsrPrice;
          updateData.snapshotPsrPrice_currency = uzsCurrency;
          updateData.snapshotPsrPrice_exchange_rate = oneRate;
          updateData.snapshotPsrPrice_amount_uzs = task.snapshotPsrPrice;
          updateData.snapshotPsrPrice_exchange_source = 'CBU' as ExchangeSource;
        }

        if (task.snapshotWorkerPrice && !task.snapshotWorkerPrice_amount_original) {
          updateData.snapshotWorkerPrice_amount_original = task.snapshotWorkerPrice;
          updateData.snapshotWorkerPrice_currency = uzsCurrency;
          updateData.snapshotWorkerPrice_exchange_rate = oneRate;
          updateData.snapshotWorkerPrice_amount_uzs = task.snapshotWorkerPrice;
          updateData.snapshotWorkerPrice_exchange_source = 'CBU' as ExchangeSource;
        }

        if (task.snapshotCustomsPayment && !task.snapshotCustomsPayment_amount_original) {
          updateData.snapshotCustomsPayment_amount_original = task.snapshotCustomsPayment;
          updateData.snapshotCustomsPayment_currency = uzsCurrency;
          updateData.snapshotCustomsPayment_exchange_rate = oneRate;
          updateData.snapshotCustomsPayment_amount_uzs = task.snapshotCustomsPayment;
          updateData.snapshotCustomsPayment_exchange_source = 'CBU' as ExchangeSource;
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.task.update({
            where: { id: task.id },
            data: updateData,
          });
        }

        console.log(`  ✓ Task ${task.id}: Snapshots migrated`);
      } catch (error) {
        console.error(`  ✗ Task ${task.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('\n✓ Migration to universal monetary fields completed!');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  migrateToUniversalMonetaryFields()
    .then(() => {
      console.log('Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateToUniversalMonetaryFields };

