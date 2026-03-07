import cron from 'node-cron';
import { runProcessReminderJob } from './process-reminder';

/**
 * Initialize the process reminder cron
 * Runs every minute.
 * O'chirish: .env da PROCESS_REMINDER_CRON_DISABLED=1 qo'ying (tashqi cron ishlatilsa).
 */
export function initializeProcessScheduler(): void {
  if (process.env.PROCESS_REMINDER_CRON_DISABLED === '1') {
    console.log('Process reminder scheduler o\'chirilgan (PROCESS_REMINDER_CRON_DISABLED=1)');
    return;
  }

  const schedule = '* * * * *'; // every minute

  console.log('Initializing process reminder scheduler (har daqiqa)');

  cron.schedule(schedule, async () => {
    try {
      const { processed } = await runProcessReminderJob();
      if (processed > 0) {
        console.log(`[Process Scheduler] ${processed} ta eslatma yuborildi`);
      }
    } catch (error) {
      console.error('[Process Scheduler] Error running reminder job:', error);
    }
  }, {
    timezone: process.env.TZ || undefined,
  });

  console.log('Process reminder scheduler ishga tushdi');
}
