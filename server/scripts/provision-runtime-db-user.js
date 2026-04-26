/**
 * provision-runtime-db-user.js
 *
 * Creates/updates a runtime DB user with least privileges in PostgreSQL.
 *
 * Usage:
 *   node scripts/provision-runtime-db-user.js
 *
 * Required env vars:
 *   DB_RUNTIME_USER
 *   DB_RUNTIME_PASSWORD
 *
 * Admin env vars (fallback to DB_*):
 *   DB_ADMIN_HOST / DB_HOST
 *   DB_ADMIN_PORT / DB_PORT
 *   DB_ADMIN_NAME / DB_NAME
 *   DB_ADMIN_USER / DB_USER
 *   DB_ADMIN_PASSWORD / DB_PASSWORD
 */

import 'dotenv/config';
import { Client } from 'pg';

const parsePort = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const quoteIdentifier = (value) => `"${String(value).replace(/"/g, '""')}"`;
const quoteLiteral = (value) => `'${String(value).replace(/'/g, "''")}'`;

const runtimeUser = process.env.DB_RUNTIME_USER;
const runtimePassword = process.env.DB_RUNTIME_PASSWORD;

if (!runtimeUser || !runtimePassword) {
  console.error('Set DB_RUNTIME_USER and DB_RUNTIME_PASSWORD before running provisioning.');
  process.exit(1);
}

const adminConfig = {
  host: process.env.DB_ADMIN_HOST || process.env.DB_HOST || 'localhost',
  port: parsePort(process.env.DB_ADMIN_PORT || process.env.DB_PORT, 5432),
  database: process.env.DB_ADMIN_NAME || process.env.DB_NAME || 'db_VestWeb',
  user: process.env.DB_ADMIN_USER || process.env.DB_USER || 'postgres',
  password: process.env.DB_ADMIN_PASSWORD ?? process.env.DB_PASSWORD ?? '',
};

const roleIdent = quoteIdentifier(runtimeUser);
const dbIdent = quoteIdentifier(adminConfig.database);
const rolePasswordLiteral = quoteLiteral(runtimePassword);
const roleNameLiteral = quoteLiteral(runtimeUser);

const statements = [
  `DO $$\nBEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ${roleNameLiteral}) THEN\n    CREATE ROLE ${roleIdent} LOGIN PASSWORD ${rolePasswordLiteral};\n  ELSE\n    ALTER ROLE ${roleIdent} WITH LOGIN PASSWORD ${rolePasswordLiteral};\n  END IF;\nEND $$;`,
  `ALTER ROLE ${roleIdent} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;`,
  `REVOKE ALL PRIVILEGES ON DATABASE ${dbIdent} FROM ${roleIdent};`,
  `GRANT CONNECT ON DATABASE ${dbIdent} TO ${roleIdent};`,
  `GRANT USAGE ON SCHEMA public TO ${roleIdent};`,
  `REVOKE CREATE ON SCHEMA public FROM ${roleIdent};`,
  `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${roleIdent};`,
  `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${roleIdent};`,
  `GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO ${roleIdent};`,
  `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${roleIdent};`,
  `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${roleIdent};`,
  `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO ${roleIdent};`,
];

const client = new Client(adminConfig);

async function main() {
  await client.connect();
  await client.query('BEGIN');

  try {
    for (const statement of statements) {
      await client.query(statement);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }

  console.log(
    `Runtime user "${runtimeUser}" provisioned with least privileges on database "${adminConfig.database}".`,
  );
}

main().catch((error) => {
  console.error('Failed to provision runtime DB user:', error.message);
  process.exit(1);
});
