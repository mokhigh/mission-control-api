import { logger } from '../../../infrastructure/logger.js';
import { AppError } from '../../../shared/errors/AppError.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(422).json({ error: err.message });
  }

  // Mongoose cast error (bad ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ error: `Duplicate value for ${field}` });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Propagated errors from repositories with statusCode
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  logger.error('Unhandled error', { err });
  res.status(500).json({ error: 'Internal server error' });
}
