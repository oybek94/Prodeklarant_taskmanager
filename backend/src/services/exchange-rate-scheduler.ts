import cron from 'node-cron';
import { fetchAndSaveDailyRate } from './exchange-rate';

/**
 * Initialize the exchange rate scheduler
 * Runs daily at configured time (default: 9:00 AM)
 */
export function initializeExchangeRateScheduler(): void {
  // Get schedule from environment variable or use default (9 AM daily)
  const schedule = process.env.EXCHANGE_RATE_FETCH_TIME || '0 9 * * *';
  
  console.log(`Initializing exchange rate scheduler with schedule: ${schedule}`);

  // Schedule daily fetch
  cron.schedule(schedule, async () => {
    console.log(`[Exchange Rate Scheduler] Starting daily rate fetch at ${new Date().toISOString()}`);
    
    try {
      const rate = await fetchAndSaveDailyRate();
      console.log(`[Exchange Rate Scheduler] Successfully fetched and saved daily rate: ${rate.toString()}`);
    } catch (error) {
      console.error('[Exchange Rate Scheduler] Error fetching daily rate:', error);
      // Don't throw - allow scheduler to continue running
    }
  }, {
    timezone: process.env.EXCHANGE_RATE_TIMEZONE || undefined, // Use server timezone if not specified
  });

  console.log('Exchange rate scheduler initialized successfully');
}

