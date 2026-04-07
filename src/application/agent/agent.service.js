import { agentRepository } from '../../domain/agent/agent.repository.js';
import { NotFoundError } from '../../shared/errors/AppError.js';

export const agentService = {
  async createAgent(data) {
    return agentRepository.create(data);
  },

  async listAgents(filter = {}) {
    return agentRepository.findAll(filter);
  },

  async getAgent(id) {
    const agent = await agentRepository.findById(id);
    if (!agent) throw new NotFoundError('Agent');
    return agent;
  },
};
