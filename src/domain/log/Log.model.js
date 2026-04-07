import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  executionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Execution', required: true },
  level: { type: String, enum: ['info', 'warn', 'error', 'debug'], default: 'info' },
  message: { type: String, required: true },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now },
});

logSchema.index({ executionId: 1, timestamp: 1 });

export const Log = mongoose.model('Log', logSchema);
