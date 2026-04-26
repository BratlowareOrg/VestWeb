import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createRequire } from 'module';
import router from './src/routes/index.js';
import sequelize from './src/db/index.js';
import { validateJwtConfig } from './src/services/jwtService.js';
import logger from './src/services/logger.js';
import requestLoggerMiddleware from './src/middlewares/requestLoggerMiddleware.js';
import './src/db/models/index.js'; // registra todos os models e associations

const require = createRequire(import.meta.url);
const { version: packageVersion } = require('./package.json');

validateJwtConfig();

const app = express();

app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';
const APP_VERSION = process.env.APP_VERSION || process.env.npm_package_version || packageVersion || 'unknown';

const API_VERSION = process.env.API_VERSION || 'v1';
const API_BASE_PATH = `/api/${API_VERSION}`;

const parseAllowedOrigins = (value) => String(value || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const HEALTH_DB_TIMEOUT_MS = parsePositiveInt(process.env.HEALTH_DB_TIMEOUT_MS, 2000);

const corsAllowedOrigins = parseAllowedOrigins(
  process.env.CORS_ALLOWED_ORIGINS || process.env.CLIENT_URL,
);

if (corsAllowedOrigins.length === 0) {
  throw new Error('Missing CORS configuration. Define CORS_ALLOWED_ORIGINS or CLIENT_URL.');
}

const corsOptions = {
  origin: (origin, callback) => {
    // Requests sem header Origin (CLI, health checks, etc.) seguem permitidos.
    if (!origin) return callback(null, true);
    return callback(null, corsAllowedOrigins.includes(origin));
  },
  credentials: true,
};

const withTimeout = (promise, timeoutMs) => new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    reject(new Error(`Operation timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  promise
    .then((result) => {
      clearTimeout(timeout);
      resolve(result);
    })
    .catch((error) => {
      clearTimeout(timeout);
      reject(error);
    });
});

const checkDatabaseHealth = async () => {
  try {
    await withTimeout(
      sequelize.query('SELECT 1', { logging: false, plain: true, raw: true }),
      HEALTH_DB_TIMEOUT_MS,
    );
    return 'ok';
  } catch (error) {
    logger.warn(
      {
        err: error,
        event: 'health_database_check_failed',
      },
      'Database health check failed',
    );
    return 'degraded';
  }
};

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: isProduction,
}));

app.use(cors(corsOptions));
app.use(cookieParser());

// Stripe webhook precisa do body raw - deve vir ANTES do express.json()
app.use([
  `${API_BASE_PATH}/payments/webhook`,
], express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(requestLoggerMiddleware);

// Versioned API (preferred)
app.use(API_BASE_PATH, router);

app.get('/health', async (req, res) => {
  const databaseStatus = await checkDatabaseHealth();
  const status = databaseStatus === 'ok' ? 'ok' : 'degraded';

  const payload = {
    status,
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    apiVersion: API_VERSION,
    services: {
      database: databaseStatus,
    },
  };

  if (status === 'degraded') {
    return res.status(503).json(payload);
  }

  return res.json(payload);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  const status = Number.isInteger(err?.status) ? err.status : 500;

  const requestLogger = req.log || logger;
  requestLogger.error(
    {
      err,
      event: 'unhandled_error',
      method: req.method,
      path: req.originalUrl,
      status,
    },
    'Unhandled error',
  );

  const message = status >= 500 ? 'Internal server error' : (err.message || 'Request error');
  res.status(status).json({ message });
});

sequelize.authenticate()
  .then(() => {
    app.listen(PORT, () => {
      logger.info({ event: 'server_started', port: PORT }, 'VestWeb server running');
    });
  })
  .catch((err) => {
    logger.fatal({ err, event: 'database_connection_failed' }, 'Erro ao conectar ao banco de dados');
    process.exit(1);
  });

export default app;
