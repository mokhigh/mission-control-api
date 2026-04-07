/**
 * Execution Service
 *
 * Orchestration flow:
 *   1. scheduleOrchestratorForTask(taskId)
 *      → finds the orchestrator agent
 *      → creates a queued Execution record
 *      → enqueues a BullMQ job
 *
 *   2. runExecution(executionId)   [called by the worker]
 *      → marks execution as running
 *      → spawns `claude -p <prompt>` as a child process
 *      → streams stdout line-by-line into Log + SSE
 *      → marks as success or error
 *
 *   3. createExecution(data)
 *      → direct API call to queue a specific agent on a task
 */
import { spawn } from 'child_process';
import { executionRepository } from '../../domain/execution/execution.repository.js';
import { agentRepository } from '../../domain/agent/agent.repository.js';
import { logRepository } from '../../domain/log/log.repository.js';
import { taskRepository } from '../../domain/task/task.repository.js';
import { executionQueue } from '../../infrastructure/queue/bullmq.js';
import { sseHub } from '../../infrastructure/realtime/sse.js';
import { logger } from '../../infrastructure/logger.js';

export const executionService = {
  async createExecution({ taskId, agentId, input = {} }) {
    await taskRepository.findByIdOrFail(taskId);
    await agentRepository.findByIdOrFail(agentId);

    const execution = await executionRepository.create({ taskId, agentId, input });

    const job = await executionQueue.add(
      'run-execution',
      { executionId: execution._id.toString() },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    );

    await executionRepository.updateStatus(execution._id, 'queued', { jobId: job.id });
    return execution;
  },

  async scheduleOrchestratorForTask(taskId) {
    const orchestrator = await agentRepository.findOrchestrator();
    if (!orchestrator) {
      logger.warn('No active orchestrator agent found — skipping auto-schedule');
      return null;
    }
    return executionService.createExecution({ taskId, agentId: orchestrator._id });
  },

  async getExecutionsByTask(taskId) {
    return executionRepository.findByTaskId(taskId);
  },

  /**
   * Called by the BullMQ worker.
   *
   * Spawns `claude -p <prompt>` as a local subprocess (Pro/Max subscription).
   * stdout is streamed line-by-line into Log + SSE in real time.
   * stderr is captured and emitted as warn-level logs.
   */
  async runExecution(executionId) {
    const execution = await executionRepository.findByIdOrFail(executionId);
    const [agent, task] = await Promise.all([
      agentRepository.findById(execution.agentId),
      taskRepository.findById(execution.taskId),
    ]);

    await executionRepository.updateStatus(executionId, 'running', { startedAt: new Date() });
    await taskRepository.updateStatus(execution.taskId, 'running');

    const emit = async (level, message, meta = {}) => {
      const log = await logRepository.create({ executionId, level, message, meta });
      sseHub.publish(executionId, log);
    };

    try {
      await emit('info', 'Execution started');

      const output = await runClaudeCli({ agent, task, input: execution.input, emit });

      await emit('info', 'Execution finished');
      await executionRepository.updateStatus(executionId, 'success', {
        output: { text: output },
        finishedAt: new Date(),
      });
      await taskRepository.updateStatus(execution.taskId, 'review');
    } catch (err) {
      await emit('error', err.message, { stack: err.stack });
      await executionRepository.updateStatus(executionId, 'error', { finishedAt: new Date() });
      await taskRepository.updateStatus(execution.taskId, 'failed');
      throw err;
    }
  },
};

/**
 * Builds the prompt and runs `claude -p "<prompt>"` as a child process.
 *
 * @param {{ agent, task, input, emit }} opts
 * @returns {Promise<string>} full stdout output
 */
function runClaudeCli({ agent, task, input, emit }) {
  return new Promise((resolve, reject) => {
    const prompt = buildPrompt({ agent, task, input });

    // `claude -p` runs non-interactively and prints the response to stdout
    const child = spawn('claude', ['-p', prompt], {
      stdio: ['ignore', 'pipe', 'pipe'],
      // Inherit the parent env so claude CLI can find its auth session
      env: process.env,
    });

    const outputChunks = [];
    let stderrBuf = '';

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      outputChunks.push(chunk);
      // Emit each line as a real-time log entry
      for (const line of chunk.split('\n')) {
        if (line.trim()) emit('info', line).catch(() => {});
      }
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      stderrBuf += chunk;
    });

    child.on('close', (code) => {
      if (stderrBuf.trim()) {
        emit('warn', stderrBuf.trim()).catch(() => {});
      }

      if (code !== 0) {
        return reject(
          new Error(`claude exited with code ${code}${stderrBuf ? `: ${stderrBuf.trim()}` : ''}`)
        );
      }

      resolve(outputChunks.join(''));
    });

    child.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(new Error('`claude` CLI not found — make sure it is installed and on PATH'));
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Assembles the final prompt sent to `claude -p`.
 *
 * The agent's systemPrompt provides persona + rules.
 * The task title/description provides the objective.
 * Extra `input` fields (set by the orchestrator) are appended as JSON context.
 */
function buildPrompt({ agent, task, input }) {
  const parts = [];

  if (agent?.systemPrompt) {
    parts.push(`## Agent instructions\n${agent.systemPrompt}`);
  }

  parts.push(`## Task\n**${task.title}**\n\n${task.description || '(no description)'}`);

  if (input && Object.keys(input).length > 0) {
    parts.push(`## Additional context\n\`\`\`json\n${JSON.stringify(input, null, 2)}\n\`\`\``);
  }

  return parts.join('\n\n');
}
