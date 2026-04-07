import { Task } from './Task.model.js';

export const taskRepository = {
  create: (data) => Task.create(data),
  findAll: (filter = {}) => Task.find(filter).populate('assignedAgents', 'name type').lean(),
  findById: (id) => Task.findById(id).populate('assignedAgents', 'name type').lean(),
  findByIdOrFail: async (id) => {
    const doc = await Task.findById(id).lean();
    if (!doc) throw Object.assign(new Error('Task not found'), { statusCode: 404 });
    return doc;
  },
  findByCardId: (cardId) => Task.findOne({ 'source.cardId': cardId }).lean(),
  updateStatus: (id, status) => Task.findByIdAndUpdate(id, { status }, { new: true }).lean(),
  update: (id, data) => Task.findByIdAndUpdate(id, data, { new: true }).lean(),
};
