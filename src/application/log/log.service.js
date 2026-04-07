import { logRepository } from '../../domain/log/log.repository.js';
import { executionRepository } from '../../domain/execution/execution.repository.js';
import { NotFoundError } from '../../shared/errors/AppError.js';

export const logService = {
  async getLogsByExecution(executionId) {
    const execution = await executionRepository.findById(executionId);
    if (!execution) throw new NotFoundError('Execution');
    return logRepository.findByExecutionId(executionId);
  },
};
