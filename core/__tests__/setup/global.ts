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
    await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName()}"`);
  } catch (err) {
    const msg = (err as Error).message ?? '';
    if (!msg.includes('already exists')) {
      await admin.$disconnect();
      throw err;
    }
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
