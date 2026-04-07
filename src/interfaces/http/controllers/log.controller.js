import { logService } from '../../../application/log/log.service.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

export const getLogsByExecution = asyncHandler(async (req, res) => {
  const logs = await logService.getLogsByExecution(req.params.executionId);
  res.json({ data: logs });
});
