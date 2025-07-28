import { Queue } from "bullmq";
import { Redis } from 'ioredis';
const redisConnection = new Redis('redis://localhost:6379', {
    maxRetriesPerRequest: null,
});
export const redisPublisher = new Redis('redis://localhost:6379', {
    maxRetriesPerRequest: null
});
export const redisSubscriber = new Redis('redis://localhost:6379', {
    maxRetriesPerRequest: null
});
export const pingQueue = new Queue('ping-queue', { connection: redisConnection });
export const alertQueue = new Queue('alert-queue', { connection: redisConnection });
export const cleanupQueue = pingQueue;
//# sourceMappingURL=bullmq.js.map