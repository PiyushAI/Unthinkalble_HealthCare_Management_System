import { Redis } from "ioredis";

// Upstash (or any Redis) connection, shared by all BullMQ queues/workers.
export const redisConnection = new Redis(process.env.REDIS_URL as string, {
  maxRetriesPerRequest: null, // required by BullMQ
  lazyConnect: true,
});
