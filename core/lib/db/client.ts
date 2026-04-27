import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __nuthatchPrisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__nuthatchPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__nuthatchPrisma = prisma;
}

export type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];
