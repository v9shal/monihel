import { Worker } from 'bullmq';
import prisma from '../config/prisma';
import { pingQueue,cleanupQueue } from '../config/bullmq'; 
import { pingEndpoint } from '../service/pingService';
import { alertingService } from '../service/alertingService'; 
console.log('Starting ping worker...');
const jobProcessor = async (job: any) => {
    const { endpointId } = job.data;

    const endpoint = await prisma.endpoint.findUnique({
        where: { id: endpointId },
        include: {
            user: {
                include: {
                    notificationChannels: true,
                },
            },
        },
    });

    if (!endpoint || !endpoint.user || !endpoint.isActive) {
        console.log(`[Ping Worker] Skipping job for inactive, deleted, or orphaned endpoint ${endpointId}`);
        const repeatableJobs = await cleanupQueue.getRepeatableJobs();
        const jobToRemove = repeatableJobs.find((j) => j.id === `endpoint-${endpointId}`);
        if (jobToRemove) {
            await cleanupQueue.removeRepeatableByKey(jobToRemove.key);
            console.log(`[Ping Worker] Cleaned up obsolete recurring job for endpoint ${endpointId}`);
        }
        return;
    }

    const result = await pingEndpoint(endpoint.url);

    await prisma.endpointMetric.create({
        data: {
            timestamp: new Date(),
            responseTimeMs: result.responseTimeMs,
            statusCode: result.statusCode,
            status: result.status,
            endpointId: endpoint.id,
        }
    });
    
    await alertingService.handlePingResult(endpoint, result);
};

const worker = new Worker('ping-queue', jobProcessor, {
    connection: {
        host: "localhost",
        port: 6379
    },
    concurrency: 5,
});

worker.on('completed', (job) => {
    console.log(`[Ping Worker] Job ${job.id} has completed.`);
});

worker.on('failed', (job, err) => {
    console.error(`[Ping Worker] Job ${job?.id} failed with error: ${err.message}`);
});

console.log("Ping worker is ready and listening for jobs on 'ping-queue'.");