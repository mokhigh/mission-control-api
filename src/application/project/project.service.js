import { projectRepository } from '../../domain/project/project.repository.js';
import { NotFoundError } from '../../shared/errors/AppError.js';

export const projectService = {
  async createProject(data) {
    return projectRepository.create(data);
  },

  async listProjects() {
    return projectRepository.findAll();
  },

  async getProject(id) {
    const project = await projectRepository.findById(id);
    if (!project) throw new NotFoundError('Project');
    return project;
  },
};
