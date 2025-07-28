import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { emailService } from '../service/emailService.js';
console.log('starting alert-worker process');
const redisConnection = new Redis('redis://localhost:6379', {
    maxRetriesPerRequest: null
});
emailService.initialize();
const alertJobProcessor = async (job) => {
    const { to, subject, body } = job.data;
    console.log(`[Alerter] Processing email job #${job.id} for recipient: ${to}`);
    try {
        await emailService.sendMail(to, subject, body);
        console.log(`[Alerter] Successfully processed job #${job.id}.`);
    }
    catch (error) {
        console.error(`[Alerter] Failed to process job #${job.id}.`, error);
        throw error;
    }
};
const alertWorker = new Worker('alert-queue', alertJobProcessor, {
    connection: redisConnection,
    concurrency: 10,
});
alertWorker.on('failed', (job, err) => {
    console.error(`[Alerter] Job ${job?.id} failed with error: ${err.message}`);
});
console.log("[Alerter] Worker is ready and listening for jobs on 'alert-queue'.");
//# sourceMappingURL=alert_worker.js.map