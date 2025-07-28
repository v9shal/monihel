import { Queue } from "bullmq";
import {Redis} from 'ioredis';
const redisUrl = process.env.REDIS_URL || '';

console.log(`[BullMQ] Connecting to Redis at ${redisUrl}`);

const redisConnection = new Redis(redisUrl, { maxRetriesPerRequest: null });
export const redisPublisher = new Redis(redisUrl, { maxRetriesPerRequest: null });
export const redisSubscriber = new Redis(redisUrl, { maxRetriesPerRequest: null });

export const pingQueue = new Queue('ping-queue', { connection: redisConnection });
export const alertQueue = new Queue('alert-queue', { connection: redisConnection });

export const cleanupQueue = pingQueue;