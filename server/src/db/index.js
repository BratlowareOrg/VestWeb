import { Sequelize } from 'sequelize';
import 'dotenv/config';
import logger from '../services/logger.js';

const {
  DB_HOST = 'localhost',
  DB_PORT = '5432',
  DB_NAME = 'db_VestWeb',
  DB_USER = 'postgres',
  DB_PASSWORD = '',
  DB_RUNTIME_USER,
  DB_RUNTIME_PASSWORD,
  DB_POOL_MAX = '20',
  DB_POOL_MIN = '2',
  DB_POOL_ACQUIRE = '30000',
  DB_POOL_IDLE = '10000',
  NODE_ENV = 'development',
} = process.env;

const parseIntFromEnv = (value, fallback, minValue = 0) => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < minValue) {
    return fallback;
  }
  return parsed;
};

const runtimeDbUser = DB_RUNTIME_USER || DB_USER;
const runtimeDbPassword = DB_RUNTIME_PASSWORD ?? DB_PASSWORD;

const dbPort = parseIntFromEnv(DB_PORT, 5432, 1);
const dbPoolMax = parseIntFromEnv(DB_POOL_MAX, 20, 1);
const dbPoolMinRequested = parseIntFromEnv(DB_POOL_MIN, 2, 0);
const dbPoolMin = Math.min(dbPoolMinRequested, dbPoolMax);
const dbPoolAcquire = parseIntFromEnv(DB_POOL_ACQUIRE, 30000, 1);
const dbPoolIdle = parseIntFromEnv(DB_POOL_IDLE, 10000, 1);

const sequelize = new Sequelize(DB_NAME, runtimeDbUser, runtimeDbPassword, {
  host: DB_HOST,
  port: dbPort,
  dialect: 'postgres',
  logging: NODE_ENV === 'development'
    ? (sql) => logger.debug({ event: 'sequelize_query', sql }, 'SQL query executed')
    : false,
  ...(NODE_ENV === 'production' && {
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  }),
  pool: {
    max: dbPoolMax,
    min: dbPoolMin,
    acquire: dbPoolAcquire,
    idle: dbPoolIdle,
  },
});

export default sequelize;
