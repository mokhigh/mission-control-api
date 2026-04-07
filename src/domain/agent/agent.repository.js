import { Agent } from './Agent.model.js';

export const agentRepository = {
  create: (data) => Agent.create(data),
  findAll: (filter = {}) => Agent.find(filter).lean(),
  findById: (id) => Agent.findById(id).lean(),
  findByIdOrFail: async (id) => {
    const doc = await Agent.findById(id).lean();
    if (!doc) throw Object.assign(new Error('Agent not found'), { statusCode: 404 });
    return doc;
  },
  findOrchestrator: () => Agent.findOne({ type: 'orchestrator', isActive: true }).lean(),
};
