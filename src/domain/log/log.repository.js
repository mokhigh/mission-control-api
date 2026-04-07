import { Log } from './Log.model.js';

export const logRepository = {
  create: (data) => Log.create(data),
  findByExecutionId: (executionId) =>
    Log.find({ executionId }).sort({ timestamp: 1 }).lean(),
};
