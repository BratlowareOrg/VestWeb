import { randomUUID } from 'crypto';
import logger from '../services/logger.js';

const REQUEST_ID_HEADER = 'x-request-id';

const toDurationMs = (startNs) => Number(process.hrtime.bigint() - startNs) / 1_000_000;

export const requestLoggerMiddleware = (req, res, next) => {
  const incomingRequestId = req.get(REQUEST_ID_HEADER);
  const requestId = incomingRequestId && incomingRequestId.trim() !== ''
    ? incomingRequestId.trim()
    : randomUUID();

  req.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);

  const requestLogger = logger.child({ requestId });
  req.log = requestLogger;

  const startNs = process.hrtime.bigint();

  requestLogger.info(
    {
      event: 'request_start',
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
    },
    'Incoming request',
  );

  res.on('finish', () => {
    const payload = {
      event: 'request_complete',
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Number(toDurationMs(startNs).toFixed(2)),
      contentLength: Number(res.getHeader('content-length') || 0),
    };

    if (res.statusCode >= 500) {
      requestLogger.error(payload, 'Request completed with server error');
      return;
    }

    if (res.statusCode >= 400) {
      requestLogger.warn(payload, 'Request completed with client error');
      return;
    }

    requestLogger.info(payload, 'Request completed');
  });

  next();
};

export default requestLoggerMiddleware;
