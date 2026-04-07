import { Deployment } from './Deployment.model.js';

export const deploymentRepository = {
  create: (data) => Deployment.create(data),
  findAll: (filter = {}) => Deployment.find(filter).populate('projectId', 'name').lean(),
  findById: (id) => Deployment.findById(id).lean(),
  findByIdOrFail: async (id) => {
    const doc = await Deployment.findById(id).lean();
    if (!doc) throw Object.assign(new Error('Deployment not found'), { statusCode: 404 });
    return doc;
  },
  update: (id, data) => Deployment.findByIdAndUpdate(id, data, { new: true }).lean(),
};
