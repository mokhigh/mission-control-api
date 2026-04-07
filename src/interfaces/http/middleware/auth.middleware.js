import { verifyToken } from '../../../shared/utils/jwt.js';
import { UnauthorizedError } from '../../../shared/errors/AppError.js';

/**
 * Validates Bearer JWT and attaches decoded payload to req.user.
 */
export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing Bearer token'));
  }

  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}
