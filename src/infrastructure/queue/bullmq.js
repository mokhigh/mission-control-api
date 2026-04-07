import { Queue, QueueEvents } from 'bullmq';
import { getRedis } from '../cache/redis.js';

const connection = { connection: getRedis() };

export const executionQueue = new Queue('executions', connection);
export const executionQueueEvents = new QueueEvents('executions', connection);

// Queue consumed from trello-watcher (must match trello-watcher's queue name exactly)
export const trelloTaskQueue = new Queue(
  process.env.TRELLO_TASK_QUEUE || 'trello-events',
  connection
);
