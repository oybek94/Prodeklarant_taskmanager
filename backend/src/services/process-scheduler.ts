import cron from 'node-cron';
import { runProcessReminderJob } from './process-reminder';

/**
 * Initialize the process reminder cron
 * Runs every minute
 */
export function initializeProcessScheduler(): void {
  const schedule = '* * * * *'; // every minute

  console.log('Initializing process reminder scheduler');

  cron.schedule(schedule, async () => {
    try {
      await runProcessReminderJob();
    } catch (error) {
      console.error('[Process Scheduler] Error running reminder job:', error);
    }
  }, {
    timezone: process.env.TZ || undefined,
  });

  console.log('Process reminder scheduler initialized');
}
