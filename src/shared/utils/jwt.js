import jwt from 'jsonwebtoken';

const { JWT_SECRET, JWT_EXPIRES_IN = '7d' } = process.env;

export const signToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

export const verifyToken = (token) =>
  jwt.verify(token, JWT_SECRET);
