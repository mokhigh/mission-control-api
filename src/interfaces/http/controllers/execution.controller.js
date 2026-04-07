import { executionService } from '../../../application/execution/execution.service.js';
import { sseHub } from '../../../infrastructure/realtime/sse.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

export const createExecution = asyncHandler(async (req, res) => {
  const execution = await executionService.createExecution(req.body);
  res.status(202).json({ data: execution });
});

export const getExecutionsByTask = asyncHandler(async (req, res) => {
  const executions = await executionService.getExecutionsByTask(req.params.taskId);
  res.json({ data: executions });
});

export const resumeExecution = asyncHandler(async (req, res) => {
  const execution = await executionService.resumeExecution(req.params.id);
  res.status(202).json({ data: execution });
});

/**
 * SSE endpoint — streams live logs for an execution.
 * GET /executions/:id/logs/stream
 */
export const streamExecutionLogs = (req, res) => {
  sseHub.subscribe(req.params.id, res);
};
