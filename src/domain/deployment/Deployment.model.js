import mongoose from 'mongoose';

const STATUSES = ['pending', 'approved', 'rejected', 'deployed', 'failed'];

const diffLineSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['add', 'remove', 'context'], required: true },
    content: { type: String, default: '' },
  },
  { _id: false }
);

const diffHunkSchema = new mongoose.Schema(
  {
    header: { type: String, default: '' },
    lines: { type: [diffLineSchema], default: [] },
  },
  { _id: false }
);

const diffFileSchema = new mongoose.Schema(
  {
    path: { type: String, required: true },
    additions: { type: Number, default: 0 },
    deletions: { type: Number, default: 0 },
    hunks: { type: [diffHunkSchema], default: [] },
  },
  { _id: false }
);

const repoResultSchema = new mongoose.Schema(
  {
    repoName: { type: String, required: true },
    commitHash: { type: String, default: '' },
    diffSummary: { type: String, default: '' },
    branch: { type: String, default: '' },
  },
  { _id: false }
);

const deploymentSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    status: { type: String, enum: STATUSES, default: 'pending' },
    repoResults: { type: [repoResultSchema], default: [] },
    files: { type: [diffFileSchema], default: [] },
    // Legacy single-value fields kept for backward compat; new code uses repoResults
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
