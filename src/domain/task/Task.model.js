import mongoose from 'mongoose';

const STATUSES = ['pending', 'running', 'review', 'approved', 'deployed', 'failed'];

const taskSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    source: {
      provider: { type: String, default: 'trello' },
      cardId: String,
      cardUrl: String,
      listName: String,
    },
    status: { type: String, enum: STATUSES, default: 'pending' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    assignedAgents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Agent' }],
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

taskSchema.index({ projectId: 1, status: 1 });
taskSchema.index({ 'source.cardId': 1 }, { sparse: true });

export const Task = mongoose.model('Task', taskSchema);
