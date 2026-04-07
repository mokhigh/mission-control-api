import mongoose from 'mongoose';

const STATUSES = ['pending', 'approved', 'rejected', 'deployed', 'failed'];

const deploymentSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    status: { type: String, enum: STATUSES, default: 'pending' },
    diffSummary: { type: String, default: '' },
    commitHash: { type: String, default: '' },
    environment: { type: String, enum: ['dev', 'staging', 'prod'], required: true },
    approvedBy: { type: String, default: null }, // user id or name
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },
    deployedAt: { type: Date, default: null },
    providerRef: { type: String, default: null }, // e.g. Vercel deployment ID
  },
  { timestamps: true }
);

deploymentSchema.index({ projectId: 1, status: 1 });
deploymentSchema.index({ taskId: 1 });

export const Deployment = mongoose.model('Deployment', deploymentSchema);
