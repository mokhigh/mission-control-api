import { taskRepository } from '../../domain/task/task.repository.js';
import { projectRepository } from '../../domain/project/project.repository.js';
import { executionService } from '../execution/execution.service.js';
import { NotFoundError, ValidationError } from '../../shared/errors/AppError.js';
import { logger } from '../../infrastructure/logger.js';

export const taskService = {
  async createTask(data) {
    const project = await projectRepository.findById(data.projectId);
    if (!project) throw new NotFoundError('Project');

    const task = await taskRepository.create(data);

    // Trigger the orchestrator to build execution pipeline (non-blocking)
    executionService.scheduleOrchestratorForTask(task._id.toString()).catch((err) =>
      logger.error('Failed to schedule orchestrator', { taskId: task._id, err })
    );

    return task;
  },

  async listTasks(filter = {}) {
    return taskRepository.findAll(filter);
  },

  async getTask(id) {
    const task = await taskRepository.findById(id);
    if (!task) throw new NotFoundError('Task');
    return task;
  },

  async updateStatus(id, status) {
    const task = await taskRepository.updateStatus(id, status);
    if (!task) throw new NotFoundError('Task');
    return task;
  },
};

/**
 * Called by the Trello BullMQ worker when a card event arrives.
 * Maps the trello-watcher payload to our Task schema.
 */
export async function createTaskFromTrello(payload) {
  const { cardId, cardName, description, listName, boardId, priority, projectId } = payload;

  // Idempotency: skip if we already ingested this card
  const existing = await taskRepository.findByCardId(cardId);
  if (existing) {
    logger.info(`[trello] card ${cardId} already exists as task ${existing._id}`);
    return existing;
  }

  if (!projectId) {
    logger.warn(`[trello] card ${cardId} has no projectId mapping — skipping`);
    return null;
  }

  const project = await projectRepository.findBySlug(projectId);
  if (!project) {
    logger.warn(`[trello] no project found with slug "${projectId}" — skipping`);
    return null;
  }

  return taskService.createTask({
    projectId: project._id,
    title: cardName,
    description: description || '',
    source: { provider: 'trello', cardId, listName },
    priority: priority || 'medium',
    metadata: { boardId },
  });
}
