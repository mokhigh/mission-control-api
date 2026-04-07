import { projectService } from '../../../application/project/project.service.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

export const createProject = asyncHandler(async (req, res) => {
  const project = await projectService.createProject(req.body);
  res.status(201).json({ data: project });
});

export const listProjects = asyncHandler(async (req, res) => {
  const projects = await projectService.listProjects();
  res.json({ data: projects });
});

export const getProject = asyncHandler(async (req, res) => {
  const project = await projectService.getProject(req.params.id);
  res.json({ data: project });
});
