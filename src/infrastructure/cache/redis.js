import Redis from 'ioredis';
import { logger } from '../logger.js';

let client;

export function getRedis() {
  if (!client) {
    client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null, // required by BullMQ
    });

    client.on('connect', () => logger.info('Redis connected'));
    client.on('error', (err) => logger.error('Redis error', { err }));
  }
  return client;
}
