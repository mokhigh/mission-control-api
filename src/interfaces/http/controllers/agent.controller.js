import { agentService } from '../../../application/agent/agent.service.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

export const createAgent = asyncHandler(async (req, res) => {
  const agent = await agentService.createAgent(req.body);
  res.status(201).json({ data: agent });
});

export const listAgents = asyncHandler(async (req, res) => {
  const agents = await agentService.listAgents();
  res.json({ data: agents });
});
