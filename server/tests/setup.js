// Prevent the app from trying to connect to a real DB during tests
process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.JWT_SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.JWT_EXPIRES_IN = '1h';

