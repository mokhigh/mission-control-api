import { Execution } from './Execution.model.js';

export const executionRepository = {
  create: (data) => Execution.create(data),
  findByTaskId: (taskId) =>
    Execution.find({ taskId }).populate('agentId', 'name type').lean(),
  findById: (id) => Execution.findById(id).lean(),
  findByIdOrFail: async (id) => {
    const doc = await Execution.findById(id).lean();
    if (!doc) throw Object.assign(new Error('Execution not found'), { statusCode: 404 });
    return doc;
  },
  updateStatus: (id, status, extra = {}) =>
    Execution.findByIdAndUpdate(id, { status, ...extra }, { new: true }).lean(),
};
