import { signToken } from '../../../shared/utils/jwt.js';
import { UnauthorizedError } from '../../../shared/errors/AppError.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

/**
 * POST /auth/token
 * Body: { username, password }
 *
 * Credentials are read from env vars (API_USER / API_PASS).
 * Returns a signed JWT usable as a Bearer token on all other routes.
 */
export const getToken = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const validUser = process.env.API_USER;
  const validPass = process.env.API_PASS;

  if (!validUser || !validPass) {
    throw new Error('API_USER / API_PASS not configured in environment');
  }

  if (username !== validUser || password !== validPass) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const token = signToken({ sub: username, role: 'admin' });
  res.json({ token });
});
