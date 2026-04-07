import { deploymentRepository } from '../../domain/deployment/deployment.repository.js';
import { taskRepository } from '../../domain/task/task.repository.js';
import { NotFoundError, ValidationError } from '../../shared/errors/AppError.js';

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
    await taskRepository.updateStatus(deployment.taskId, 'approved');

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
