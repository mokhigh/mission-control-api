import { taskService } from '../../../application/task/task.service.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

export const createTask = asyncHandler(async (req, res) => {
  const task = await taskService.createTask(req.body);
  res.status(201).json({ data: task });
});

export const listTasks = asyncHandler(async (req, res) => {
  const { projectId, status } = req.query;
  const filter = {};
  if (projectId) filter.projectId = projectId;
  if (status) filter.status = status;
  const tasks = await taskService.listTasks(filter);
  res.json({ data: tasks });
});

export const getTask = asyncHandler(async (req, res) => {
  const task = await taskService.getTask(req.params.id);
  res.json({ data: task });
});

export const updateTaskStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const task = await taskService.updateStatus(req.params.id, status);
  res.json({ data: task });
});
