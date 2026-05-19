import { Sequelize } from 'sequelize';
import 'dotenv/config';
import logger from '../services/logger.js';

const {
  DATABASE_URL,
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

const isProd = NODE_ENV === 'production';
const isRemote = DB_HOST !== 'localhost' && DB_HOST !== '127.0.0.1';
const sslOptions = isProd || isRemote ? { ssl: { require: true, rejectUnauthorized: false } } : {};

const sequelize = DATABASE_URL
  ? new Sequelize(DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: sslOptions,
      pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    })
  : new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
      host: DB_HOST,
      port: parseInt(DB_PORT, 10),
      dialect: 'postgres',
      logging: isProd ? false : console.log,
      dialectOptions: sslOptions,
      pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    });

export default sequelize;
