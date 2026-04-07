import { deploymentService } from '../../../application/deployment/deployment.service.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

export const listDeployments = asyncHandler(async (req, res) => {
  const deployments = await deploymentService.listDeployments();
  res.json({ data: deployments });
});

export const approveDeployment = asyncHandler(async (req, res) => {
  // req.user is set by auth middleware
  const deployment = await deploymentService.approveDeployment(
    req.params.id,
    req.user?.sub || 'anonymous'
  );
  res.json({ data: deployment });
});

export const rejectDeployment = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const deployment = await deploymentService.rejectDeployment(req.params.id, {
    rejectedBy: req.user?.sub || 'anonymous',
    reason,
  });
  res.json({ data: deployment });
});
