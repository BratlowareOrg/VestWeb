import jwt from 'jsonwebtoken';
import 'dotenv/config';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const MIN_JWT_SECRET_LENGTH = 64;
const MIN_JWT_SECRET_UNIQUE_CHARS = 10;

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('Missing required environment variable: JWT_SECRET');
  }

  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `Invalid JWT_SECRET: minimum length is ${MIN_JWT_SECRET_LENGTH} characters`,
    );
  }

  const uniqueCharCount = new Set(secret).size;
  if (uniqueCharCount < MIN_JWT_SECRET_UNIQUE_CHARS) {
    throw new Error(
      `Invalid JWT_SECRET: low entropy (at least ${MIN_JWT_SECRET_UNIQUE_CHARS} unique characters required)`,
    );
  }

  return secret;
};

export const validateJwtConfig = () => {
  getJwtSecret();
};

export const generateToken = (payload) => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token) => {
  return jwt.verify(token, getJwtSecret());
};
