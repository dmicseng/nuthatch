import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ??
  'postgres://nuthatch:dev_password@localhost:5432/nuthatch_test';

function adminUrl(): string {
  const url = new URL(TEST_DB_URL);
  url.pathname = '/postgres';
  return url.toString();
}

function dbName(): string {
  const url = new URL(TEST_DB_URL);
  return url.pathname.replace(/^\//, '');
}

export async function setup() {
  const admin = new PrismaClient({
    datasources: { db: { url: adminUrl() } },
  });
  try {
    // Drop+recreate so schema-changing migrations (e.g. ALTER COLUMN ... NOT
    // NULL) always run against a clean slate. Postgres 13+ FORCE closes any
    // open connections so the drop succeeds even if a prior run left them open.
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${dbName()}" WITH (FORCE)`);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName()}"`);
  } finally {
    await admin.$disconnect();
  }

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: 'inherit',
  });
}

export async function teardown() {
  // intentionally keep DB so devs can inspect last run
}
