import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.current_password',
  'req.body.new_password',
  'req.body.confirm_password',
  'password',
  'current_password',
  'new_password',
  'confirm_password',
];

const logger = pino({
  level: process.env.LOG_LEVEL || (isTest ? 'silent' : (isProduction ? 'info' : 'debug')),
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]',
  },
  serializers: {
    err: pino.stdSerializers.err,
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
});

export const getRequestLogger = (req) => req.log || logger;

export default logger;
