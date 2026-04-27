import { PrismaClient } from '@prisma/client';

export const testPrisma = new PrismaClient();

const TABLES_TO_TRUNCATE = [
  'used_invites',
  'audit_log',
  'budgets',
  'credentials',
  'usage_snapshots',
  'billing_events',
  'services',
  'memberships',
  'users',
  'organizations',
];

export async function resetDb() {
  await testPrisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES_TO_TRUNCATE.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );
}

export async function disconnect() {
  await testPrisma.$disconnect();
}
