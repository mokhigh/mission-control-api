import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './infrastructure/database/mongoose.js';
import {
  startExecutionWorker,
  startTrelloWorker,
} from './infrastructure/queue/workers/execution.worker.js';
import { logger } from './infrastructure/logger.js';

const PORT = process.env.PORT || 3005;

async function bootstrap() {
  await connectDatabase();

  // Start queue workers
  startExecutionWorker();
  startTrelloWorker();

  app.listen(PORT, () => {
    logger.info(`mission-control-api listening on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  logger.error('Fatal startup error', { err });
  process.exit(1);
});
