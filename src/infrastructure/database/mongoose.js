import mongoose from 'mongoose';
import { logger } from '../logger.js';

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('error', (err) => logger.error('MongoDB error', { err }));

  await mongoose.connect(uri);
  logger.info('MongoDB connected');
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
