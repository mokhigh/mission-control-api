import { deploymentRepository } from '../../domain/deployment/deployment.repository.js';
import { taskRepository } from '../../domain/task/task.repository.js';
import { NotFoundError, ValidationError } from '../../shared/errors/AppError.js';
import { completeCard } from '../../infrastructure/trello/trello.client.js';

export const deploymentService = {
  async listDeployments(filter = {}) {
    return deploymentRepository.findAll(filter);
  },

  async createDeployment(data) {
    return deploymentRepository.create(data);
  },

  async approveDeployment(id, approvedBy) {
    const deployment = await deploymentRepository.findByIdOrFail(id);

    if (deployment.status !== 'pending') {
      throw new ValidationError(`Deployment is already ${deployment.status}`);
    }

    const updated = await deploymentRepository.update(id, {
      status: 'approved',
      approvedBy,
      approvedAt: new Date(),
    });

    // Move the task to approved
    const task = await taskRepository.updateStatus(deployment.taskId, 'approved');

    // Move the Trello card to the finished list (non-blocking)
    if (task?.source?.cardId && task?.source?.finishedListId) {
      completeCard(task.source.cardId, task.source.finishedListId).catch(() => {});
    }

    return updated;
  },

  async rejectDeployment(id, { rejectedBy, reason } = {}) {
    const deployment = await deploymentRepository.findByIdOrFail(id);

    if (deployment.status !== 'pending') {
      throw new ValidationError(`Deployment is already ${deployment.status}`);
    }

    const updated = await deploymentRepository.update(id, {
      status: 'rejected',
      approvedBy: rejectedBy || null,
      rejectedAt: new Date(),
      rejectionReason: reason || null,
    });

    // Move the task back to failed
    await taskRepository.updateStatus(deployment.taskId, 'failed');

    return updated;
  },
};
