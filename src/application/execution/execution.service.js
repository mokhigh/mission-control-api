/**
 * Execution Service
 *
 * Orchestration flow:
 *   1. scheduleOrchestratorForTask(taskId)
 *      → finds the orchestrator agent
 *      → creates a queued Execution (phase: 'orchestrate')
 *      → enqueues a BullMQ job
 *
 *   2. runExecution(executionId)   [called by the worker]
 *      → if phase is 'orchestrate':
 *          → runs `claude -p` to produce a JSON plan
 *          → parses the plan → creates specialist Executions (phase: 'implement')
 *      → if phase is 'implement':
 *          → git clone/pull the repo
 *          → runs `claude` in agentic mode inside the repo checkout
 *          → streams output into Log + SSE
 *          → on success: if all siblings done → task → review
 *
 *   3. createExecution(data)
 *      → direct API call to queue a specific agent on a task
 */
import { spawn } from 'child_process';
import { executionRepository } from '../../domain/execution/execution.repository.js';
import { agentRepository } from '../../domain/agent/agent.repository.js';
import { logRepository } from '../../domain/log/log.repository.js';
import { taskRepository } from '../../domain/task/task.repository.js';
import { projectRepository } from '../../domain/project/project.repository.js';
import { deploymentRepository } from '../../domain/deployment/deployment.repository.js';
import { executionQueue } from '../../infrastructure/queue/bullmq.js';
import { sseHub } from '../../infrastructure/realtime/sse.js';
import { commitAndPush, buildBranchName } from '../../infrastructure/git/branch.service.js';
import { ensureCheckout } from '../../infrastructure/git/checkout.service.js';
import { logger } from '../../infrastructure/logger.js';

// ── Fixed agent roster ─────────────────────────────────────────────────────
// The orchestrator MUST pick from these names. Anything else gets a fallback.
const AGENT_ROSTER = ['frontend', 'backend', 'devops', 'reviewer'];

export const executionService = {
  async createExecution({ taskId, agentId, input = {}, phase = 'orchestrate' }) {
    await taskRepository.findByIdOrFail(taskId);
    await agentRepository.findByIdOrFail(agentId);

    const execution = await executionRepository.create({ taskId, agentId, input, phase });

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
    return executionService.createExecution({
      taskId,
      agentId: orchestrator._id,
      phase: 'orchestrate',
    });
  },

  async getExecutionsByTask(taskId) {
    return executionRepository.findByTaskId(taskId);
  },

  /**
   * Called by the BullMQ worker.
   * Routes to orchestrate or implement based on execution.phase.
   */
  async runExecution(executionId) {
    const execution = await executionRepository.findByIdOrFail(executionId);

    if (execution.phase === 'implement') {
      return runImplementation(executionId, execution);
    }

    // Default: orchestrate phase
    return runOrchestration(executionId, execution);
  },
};

// ── Orchestrate phase ──────────────────────────────────────────────────────

async function runOrchestration(executionId, execution) {
  const [agent, task] = await Promise.all([
    agentRepository.findById(execution.agentId),
    taskRepository.findById(execution.taskId),
  ]);

  await executionRepository.updateStatus(executionId, 'running', { startedAt: new Date() });
  await taskRepository.updateStatus(execution.taskId, 'running');

  const emit = makeEmitter(executionId);

  try {
    await emit('info', 'Orchestration started');

    const output = await runClaudeCli({
      agent,
      task,
      input: execution.input,
      emit,
      // Orchestrator runs without cwd — it just produces a plan
      cwd: null,
      agentic: false,
    });

    await emit('info', 'Orchestration finished');
    await executionRepository.updateStatus(executionId, 'success', {
      output: { text: output },
      finishedAt: new Date(),
    });

    // Parse the plan and schedule specialist executions
    const scheduled = await scheduleSpecialists(execution.taskId, task, output, emit);

    if (scheduled === 0) {
      // No specialists needed / parseable — move straight to review
      await taskRepository.updateStatus(execution.taskId, 'review');
    }
  } catch (err) {
    await emit('error', err.message, { stack: err.stack });
    await executionRepository.updateStatus(executionId, 'error', { finishedAt: new Date() });
    await taskRepository.updateStatus(execution.taskId, 'failed');
    throw err;
  }
}

// ── Implement phase ────────────────────────────────────────────────────────

async function runImplementation(executionId, execution) {
  const [agent, task] = await Promise.all([
    agentRepository.findById(execution.agentId),
    taskRepository.findById(execution.taskId),
  ]);

  const project = await projectRepository.findById(task.projectId);

  await executionRepository.updateStatus(executionId, 'running', { startedAt: new Date() });

  const emit = makeEmitter(executionId);

  try {
    // Checkout the repo so claude has a real working directory
    const repo = pickRepo(project, agent);
    await emit('info', `Checking out ${repo.name} @ ${repo.branch || 'main'} …`);
    const cwd = await ensureCheckout({ slug: project.slug, repository: repo });
    await emit('info', `Repo ready at ${cwd}`);

    await emit('info', 'Implementation started');

    const output = await runClaudeCli({
      agent,
      task,
      input: execution.input,
      emit,
      cwd,
      agentic: true,
    });

    await emit('info', 'Implementation finished');
    await executionRepository.updateStatus(executionId, 'success', {
      output: { text: output },
      finishedAt: new Date(),
    });

    // Check if all sibling implement-executions for this task are done
    await maybeCompleteTask(execution.taskId);
  } catch (err) {
    await emit('error', err.message, { stack: err.stack });
    await executionRepository.updateStatus(executionId, 'error', { finishedAt: new Date() });
    await taskRepository.updateStatus(execution.taskId, 'failed');
    throw err;
  }
}

// ── Plan parser + specialist scheduler ─────────────────────────────────────

async function scheduleSpecialists(taskId, task, rawOutput, emit) {
  let plan;

  try {
    // The orchestrator wraps its JSON in ```json ... ``` sometimes
    const jsonStr = rawOutput.replace(/^```json\s*/m, '').replace(/```\s*$/m, '').trim();
    plan = JSON.parse(jsonStr);
  } catch {
    await emit('warn', 'Could not parse orchestrator output as JSON — skipping specialist scheduling');
    return 0;
  }

  const agents = plan.agents;
  if (!Array.isArray(agents) || agents.length === 0) {
    await emit('warn', 'Orchestrator plan has no agents — skipping');
    return 0;
  }

  let scheduled = 0;

  for (const entry of agents) {
    const requestedName = entry.name?.toLowerCase().trim();
    if (!requestedName) continue;

    // Match against roster, fallback to 'backend'
    const rosterName = AGENT_ROSTER.includes(requestedName) ? requestedName : 'backend';

    const agent = await agentRepository.findByName(rosterName);
    if (!agent) {
      await emit('warn', `Agent "${rosterName}" not found in DB — skipping`);
      continue;
    }

    await executionService.createExecution({
      taskId,
      agentId: agent._id,
      phase: 'implement',
      input: {
        orchestratorPlan: plan,
        assignedAgent: entry,
        steps: plan.steps || [],
      },
    });

    await taskRepository.update(taskId, { $addToSet: { assignedAgents: agent._id } });

    await emit('info', `Scheduled "${rosterName}" agent (requested: "${requestedName}")`);
    scheduled++;
  }

  return scheduled;
}

// ── Completion check ───────────────────────────────────────────────────────

async function maybeCompleteTask(taskId) {
  const executions = await executionRepository.findByTaskId(taskId);
  const implementations = executions.filter((e) => e.phase === 'implement');

  const allDone = implementations.length > 0 && implementations.every(
    (e) => e.status === 'success' || e.status === 'error'
  );

  if (!allDone) return;

  const anyError = implementations.some((e) => e.status === 'error');
  if (anyError) {
    await taskRepository.updateStatus(taskId, 'failed');
    return;
  }

  // All implementations succeeded — create branch, commit, and deployment record
  const task = await taskRepository.findById(taskId);
  const project = await projectRepository.findById(task.projectId);
  const emit = makeEmitter(implementations[0]._id.toString());

  try {
    // Commit changes in each repo that has modifications
    const repos = project?.repositories || [];
    let lastResult = null;

    for (const repo of repos) {
      const { ensureCheckout: _, getWorkspaceDir } = await import('../../infrastructure/git/checkout.service.js');
      const path = await import('path');
      const repoDir = path.default.join(getWorkspaceDir(project.slug), repo.name);

      const branchName = buildBranchName(taskId.toString(), task.title);
      const commitMessage = `feat: ${task.title}\n\nTask: ${taskId}\nSource: ${task.source?.provider || 'manual'}`;

      const result = await commitAndPush({ cwd: repoDir, branchName, commitMessage });

      if (result.commitHash) {
        await emit('info', `Branch "${branchName}" created with commit ${result.commitHash.slice(0, 8)}`);
        if (result.pushed) {
          await emit('info', `Pushed to origin/${branchName}`);
        }
        lastResult = { ...result, branchName };
      }
    }

    // Create a deployment record so the ApprovalPanel appears
    await deploymentRepository.create({
      projectId: task.projectId,
      taskId,
      status: 'pending',
      environment: 'dev',
      commitHash: lastResult?.commitHash || '',
      diffSummary: lastResult?.diffSummary || '',
    });

    await emit('info', 'Deployment created — awaiting approval');
    await taskRepository.updateStatus(taskId, 'review');
  } catch (err) {
    logger.error('[maybeCompleteTask] branch/deployment creation failed', { taskId, err });
    await emit('warn', `Branch creation failed: ${err.message}`);
    // Still move to review even if branch creation fails
    await taskRepository.updateStatus(taskId, 'review');
  }
}

// ── Repo picker ────────────────────────────────────────────────────────────

function pickRepo(project, agent) {
  const repos = project?.repositories || [];
  if (repos.length === 0) {
    throw new Error(`Project "${project.slug}" has no repositories configured`);
  }
  // If the agent type hints at which repo, try to match by name
  if (agent?.type === 'frontend') {
    const match = repos.find((r) => /dashboard|frontend|web|ui/i.test(r.name));
    if (match) return match;
  }
  if (agent?.type === 'backend') {
    const match = repos.find((r) => /api|backend|server/i.test(r.name));
    if (match) return match;
  }
  // Default: first repo
  return repos[0];
}

// ── Shared helpers ─────────────────────────────────────────────────────────

function makeEmitter(executionId) {
  return async (level, message, meta = {}) => {
    const log = await logRepository.create({ executionId, level, message, meta });
    sseHub.publish(executionId, log);
  };
}

/**
 * Runs `claude` as a child process.
 *
 * @param {{ agent, task, input, emit, cwd: string|null, agentic: boolean }} opts
 * @returns {Promise<string>} full stdout output
 */
function runClaudeCli({ agent, task, input, emit, cwd, agentic }) {
  return new Promise((resolve, reject) => {
    const prompt = buildPrompt({ agent, task, input });

    // Orchestrate: `claude -p` (print mode, no file access)
    // Implement:   `claude -p --dangerously-skip-permissions` (agentic, full file access)
    const args = ['-p', prompt];
    if (agent?.model) {
      args.push('--model', agent.model);
    }
    if (agent?.effort) {
      args.push('--effort', agent.effort);
    }
    if (agentic) {
      args.push('--dangerously-skip-permissions');
    }

    const child = spawn('claude', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
      ...(cwd ? { cwd } : {}),
    });

    const outputChunks = [];
    let stderrBuf = '';

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      outputChunks.push(chunk);
      for (const line of chunk.split('\n')) {
        if (line.trim()) emit('info', line).catch(() => { });
      }
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      stderrBuf += chunk;
    });

    child.on('close', (code) => {
      if (stderrBuf.trim()) {
        emit('warn', stderrBuf.trim()).catch(() => { });
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
 * Assembles the final prompt sent to `claude`.
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
