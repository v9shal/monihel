import { Worker } from 'bullmq';
import prisma from '../config/prisma.js';
import { cleanupQueue, redisPublisher } from '../config/bullmq.js'; 
import { pingEndpoint } from '../service/pingService.js';
import { alertingService ,EndpointWithRelations} from '../service/alertingService.js';

console.log('Starting ping worker (Redis Pub/Sub Mode)...');

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

    
    if (!endpoint || !endpoint.isActive) {
        console.log(`[Ping Worker] Skipping job for inactive/deleted endpoint ${endpointId}`);
        // Optional: Add logic here to clean up the repeating job from the queue
        return;
    }

    // Second, specifically check if the user relationship exists.
    if (!endpoint.user) {
        console.error(`[Ping Worker] Endpoint ${endpointId} is active but has no associated user. Cannot proceed with alerting.`);
        return; // Stop processing if there's no user
    }
   

    const result = await pingEndpoint(endpoint.url);

    const timestamp = new Date();
    const metric = await prisma.endpointMetric.create({
        data: {
            timestamp,
            responseTimeMs: result.responseTimeMs,
            statusCode: result.statusCode,
            status: result.status,
            endpointId: endpoint.id,
        }
    });

    await alertingService.handlePingResult(endpoint as EndpointWithRelations, result);

    const updatedEndpoint = await prisma.endpoint.findUnique({
        where: { id: endpointId },
        include: {
            user: {
                include: {
                    notificationChannels: true,
                },
            },
            _count: {
                select: {
                    metrics: true,
                    alerts: true,
                },
            },
        },
    });

    if (updatedEndpoint) {
        const channel = `user-events:${endpoint.userId}`;

        const metricMessage = JSON.stringify({
            type: 'ping-update',
            payload: {
                timestamp: metric.timestamp,
                responseTimeMs: metric.responseTimeMs,
                statusCode: metric.statusCode,
                status: metric.status,
                endpointId: metric.endpointId,
            },
        });
        redisPublisher.publish(channel, metricMessage);

        const endpointMessage = JSON.stringify({
            type: 'endpoint-updated',
            payload: {
                ...updatedEndpoint,
                latestStatus: result.status,
                latestResponseTime: result.responseTimeMs,
                latestTimestamp: new Date().toISOString(),
            },
        });
        redisPublisher.publish(channel, endpointMessage);

        console.log(`[Ping Worker] Published ping-update and endpoint-updated to channel: ${channel}`);
    }
};


const worker = new Worker('ping-queue', jobProcessor, {
    connection: {
        host: "localhost",
        port: 6379
    },
    concurrency: 5,
});

worker.on('completed', (job) => {
    console.log(`[Ping Worker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
    console.error(`[Ping Worker] Job ${job?.id} failed:`, err.message);
});

console.log("Ping worker ready and listening for jobs on 'ping-queue'.");