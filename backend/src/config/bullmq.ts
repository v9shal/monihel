import { Queue } from "bullmq";
import IORedis from 'ioredis';

const redisConnection = new IORedis('redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

export const pingQueue = new Queue('ping-queue', { connection: redisConnection });
export const alertQueue = new Queue('alert-queue', { connection: redisConnection });

export const cleanupQueue = pingQueue;