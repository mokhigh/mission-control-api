import mongoose from 'mongoose';

const STATUSES = ['queued', 'running', 'success', 'error', 'paused'];

const executionSchema = new mongoose.Schema(
  {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
    status: { type: String, enum: STATUSES, default: 'queued' },
    phase: { type: String, enum: ['orchestrate', 'implement'], default: 'orchestrate' },
    input: { type: mongoose.Schema.Types.Mixed, default: {} },
    output: { type: mongoose.Schema.Types.Mixed, default: null },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    jobId: { type: String, default: null }, // BullMQ job id
    checkpoint: { type: mongoose.Schema.Types.Mixed, default: null },
    pausedReason: { type: String, default: null },
  },
  { timestamps: true }
);

executionSchema.index({ taskId: 1 });
executionSchema.index({ agentId: 1 });
executionSchema.index({ status: 1 });

export const Execution = mongoose.model('Execution', executionSchema);
