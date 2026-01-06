import { PrismaClient, Currency } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { createWorkerPayment } from '../src/services/worker-payment';

const prisma = new PrismaClient();

/**
 * Migrate existing SALARY transactions to WorkerPayment records
 */
async function migrateWorkerPayments() {
  console.log('Starting migration of SALARY transactions to WorkerPayment records...');

  try {
    // Get all SALARY transactions, ordered by date
    const salaryTransactions = await prisma.transaction.findMany({
      where: {
        type: 'SALARY',
      },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        date: 'asc', // Process chronologically
      },
    });

    console.log(`Found ${salaryTransactions.length} SALARY transactions to migrate`);

    // Group by worker to process chronologically per worker
    const transactionsByWorker = new Map<number, typeof salaryTransactions>();
    for (const tx of salaryTransactions) {
      if (!tx.workerId || !tx.worker) continue;
      
      if (!transactionsByWorker.has(tx.workerId)) {
        transactionsByWorker.set(tx.workerId, []);
      }
      transactionsByWorker.get(tx.workerId)!.push(tx);
    }

    let successCount = 0;
    let errorCount = 0;

    // Process each worker's transactions
    for (const [workerId, transactions] of transactionsByWorker.entries()) {
      console.log(`\nProcessing worker ${workerId} (${transactions.length} transactions)...`);

      for (const tx of transactions) {
        try {
          // Determine payment currency and amount
          const paidCurrency: Currency = tx.currency_universal || tx.originalCurrency || tx.currency || 'USD';
          let paidAmount: Decimal;
          let exchangeRate: Decimal | undefined;

          if (paidCurrency === 'USD') {
            // USD payment
            paidAmount = tx.amount_original || tx.originalAmount || tx.amount || new Decimal(0);
          } else if (paidCurrency === 'UZS') {
            // UZS payment - need to convert to USD equivalent
            paidAmount = tx.amount_uzs || tx.convertedUzsAmount || tx.amount || new Decimal(0);
            exchangeRate = tx.exchange_rate || tx.exchangeRate || undefined;
            
            if (!exchangeRate) {
              console.warn(
                `Transaction ${tx.id}: No exchange rate found for UZS payment. Skipping.`
              );
              errorCount++;
              continue;
            }
          } else {
            console.warn(
              `Transaction ${tx.id}: Unsupported currency ${paidCurrency}. Skipping.`
            );
            errorCount++;
            continue;
          }

          // Check if WorkerPayment already exists for this transaction
          const existingPayment = await prisma.workerPayment.findFirst({
            where: {
              workerId,
              paymentDate: tx.date,
              paidAmountUsd: tx.amount_original || tx.originalAmount || tx.amount,
            },
          });

          if (existingPayment) {
            console.log(`  ✓ Transaction ${tx.id}: WorkerPayment already exists (ID: ${existingPayment.id}), skipping`);
            continue;
          }

          // Create WorkerPayment record
          await createWorkerPayment(
            workerId,
            paidCurrency,
            paidAmount,
            {
              exchangeRate,
              paymentDate: tx.date,
              comment: tx.comment || `Migrated from SALARY transaction ${tx.id}`,
              tx: prisma,
            }
          );

          console.log(`  ✓ Transaction ${tx.id}: Created WorkerPayment`);
          successCount++;
        } catch (error: any) {
          console.error(`  ✗ Transaction ${tx.id}: ${error.message}`);
          errorCount++;
        }
      }
    }

    console.log(`\n=== Migration Summary ===`);
    console.log(`Total transactions processed: ${salaryTransactions.length}`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`\n✓ Migration completed!`);
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  migrateWorkerPayments()
    .then(() => {
      console.log('Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateWorkerPayments };

