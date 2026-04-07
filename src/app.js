import express from 'express';
import cors from 'cors';
import { requestLogger } from './interfaces/http/middleware/logger.middleware.js';
import { errorHandler } from './interfaces/http/middleware/error.middleware.js';

import authRoutes from './interfaces/http/routes/auth.routes.js';
import adminRoutes from './interfaces/http/routes/admin.routes.js';
import projectRoutes from './interfaces/http/routes/project.routes.js';
import taskRoutes from './interfaces/http/routes/task.routes.js';
import agentRoutes from './interfaces/http/routes/agent.routes.js';
import executionRoutes from './interfaces/http/routes/execution.routes.js';
import logRoutes from './interfaces/http/routes/log.routes.js';
import deploymentRoutes from './interfaces/http/routes/deployment.routes.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/projects', projectRoutes);
app.use('/tasks', taskRoutes);
app.use('/agents', agentRoutes);
app.use('/executions', executionRoutes);
app.use('/logs', logRoutes);
app.use('/deployments', deploymentRoutes);

app.use(errorHandler);

export default app;
