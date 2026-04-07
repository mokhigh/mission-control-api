import mongoose from 'mongoose';

const agentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    type: {
      type: String,
      enum: ['backend', 'frontend', 'orchestrator', 'devops', 'reviewer', 'custom'],
      required: true,
    },
    capabilities: { type: [String], default: [] },
    // null = global agent available to all projects
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    model: { type: String, default: 'claude-sonnet-4-6' },
    effort: { type: String, enum: ['low', 'medium', 'high', 'max'], default: 'high' },
    systemPrompt: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

agentSchema.index({ type: 1, isActive: 1 });

export const Agent = mongoose.model('Agent', agentSchema);
