import { describe, it, expect, afterEach } from '@jest/globals';
import { generateToken, verifyToken, validateJwtConfig } from '../../../src/services/jwtService.js';

describe('jwtService', () => {
  const payload = { id: 1, role: 'student' };
  const originalSecret = process.env.JWT_SECRET;

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  describe('validateJwtConfig', () => {
    it('should throw when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      expect(() => validateJwtConfig()).toThrow('Missing required environment variable: JWT_SECRET');
    });

    it('should throw when JWT_SECRET is shorter than 64 characters', () => {
      process.env.JWT_SECRET = 'short_secret';
      expect(() => validateJwtConfig()).toThrow('Invalid JWT_SECRET: minimum length is 64 characters');
    });

    it('should throw when JWT_SECRET has low entropy', () => {
      process.env.JWT_SECRET = 'a'.repeat(64);
      expect(() => validateJwtConfig()).toThrow('Invalid JWT_SECRET: low entropy (at least 10 unique characters required)');
    });

    it('should not throw when JWT_SECRET is valid', () => {
      process.env.JWT_SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      expect(() => validateJwtConfig()).not.toThrow();
    });
  });

  describe('generateToken', () => {
    it('should return a string token', () => {
      const token = generateToken(payload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should embed the payload in the token', () => {
      const token = generateToken(payload);
      const decoded = verifyToken(token);
      expect(decoded.id).toBe(payload.id);
      expect(decoded.role).toBe(payload.role);
    });

    it('should generate different tokens for different payloads', () => {
      const token1 = generateToken({ id: 1, role: 'student' });
      const token2 = generateToken({ id: 2, role: 'teacher' });
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    it('should return decoded payload for a valid token', () => {
      const token = generateToken(payload);
      const decoded = verifyToken(token);
      expect(decoded.id).toBe(1);
      expect(decoded.role).toBe('student');
    });

    it('should throw JsonWebTokenError for a tampered token', () => {
      const token = generateToken(payload);
      const tampered = token.slice(0, -5) + 'XXXXX';
      expect(() => verifyToken(tampered)).toThrow();
    });

    it('should throw JsonWebTokenError for an entirely fake token', () => {
      expect(() => verifyToken('this.is.fake')).toThrow();
    });

    it('should throw TokenExpiredError for an expired token', async () => {
      const { default: jwt } = await import('jsonwebtoken');
      const expiredToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1ms' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(() => verifyToken(expiredToken)).toThrow();
    });
  });
});
