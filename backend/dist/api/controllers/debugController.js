import { pingQueue, alertQueue } from '../../config/bullmq.js';
export const clearQueue = async (req, res) => {
    try {
        await pingQueue.obliterate({ force: true });
        res.json({ message: 'Ping queue obliterated.' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to clear queue' });
    }
};
export const testEmail = async (req, res) => {
    try {
        const testJob = await alertQueue.add('send-test-email', {
            to: 'test@example.com',
            subject: 'Test Alert from API Monitor',
            body: 'This is a test to confirm the alerting system is working.'
        });
        res.status(200).json({ message: 'Test email job dispatched!', jobId: testJob.id });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to send test email' });
    }
};
//# sourceMappingURL=debugController.js.map