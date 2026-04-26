import { Sequelize } from 'sequelize';
import 'dotenv/config';

const {
  DATABASE_URL,
  DB_HOST = 'localhost',
  DB_PORT = '5432',
  DB_NAME = 'db_VestWeb',
  DB_USER = 'postgres',
  DB_PASSWORD = '',
  NODE_ENV = 'development',
} = process.env;

const isProd = NODE_ENV === 'production';
const sslOptions = { ssl: { require: true, rejectUnauthorized: false } };

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
      ...(isProd && { dialectOptions: sslOptions }),
      pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    });

export default sequelize;
