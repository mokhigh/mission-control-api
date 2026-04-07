import { Project } from './Project.model.js';

export const projectRepository = {
  create: (data) => Project.create(data),
  findAll: (filter = {}) => Project.find(filter).lean(),
  findById: (id) => Project.findById(id).lean(),
  findBySlug: (slug) => Project.findOne({ slug }).lean(),
  findByIdOrFail: async (id) => {
    const doc = await Project.findById(id).lean();
    if (!doc) throw Object.assign(new Error('Project not found'), { statusCode: 404 });
    return doc;
  },
  update: (id, data) => Project.findByIdAndUpdate(id, data, { new: true }).lean(),
  delete: (id) => Project.findByIdAndDelete(id),
};
