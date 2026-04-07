/**
 * Execution Worker
 *
 * Picks jobs from the `executions` queue and runs them.
 * Each job spawns a local `claude -p <prompt>` subprocess,
 * which uses the machine's Claude CLI session (Pro/Max subscription).
 */
import { Worker } from 'bullmq';
import { getRedis } from '../../cache/redis.js';
import { logger } from '../../logger.js';

// Lazy imports to avoid circular deps at module load time
let executionService;

async function getExecutionService() {
  if (!executionService) {
    const mod = await import('../../../application/execution/execution.service.js');
    executionService = mod.executionService;
  }
  return executionService;
}

export function startExecutionWorker() {
  const worker = new Worker(
    'executions',
    async (job) => {
      const svc = await getExecutionService();
      const { executionId } = job.data;

      logger.info(`[worker] starting execution ${executionId}`);
      await svc.runExecution(executionId);
      logger.info(`[worker] finished execution ${executionId}`);
    },
    {
      connection: getRedis(),
      concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
    }
  );

  worker.on('failed', (job, err) => {
    logger.error(`[worker] job ${job?.id} failed`, { err });
  });

  return worker;
}

/**
 * Trello-watcher consumer
 *
 * Reads normalized task events published by trello-watcher
 * and creates Task + pending Execution records.
 */
export function startTrelloWorker() {
  const worker = new Worker(
    process.env.TRELLO_TASK_QUEUE || 'trello-events',
    async (job) => {
      const { createTaskFromTrello } = await import(
        '../../../application/task/task.service.js'
      );
      await createTaskFromTrello(job.data);
      logger.info(`[trello-worker] ingested task from card ${job.data.cardId}`);
    },
    { connection: getRedis() }
  );

  worker.on('failed', (job, err) => {
    logger.error(`[trello-worker] job ${job?.id} failed`, { err });
  });

  return worker;
}
