import type { Prisma, UsedInvite } from '@prisma/client';
import { prisma } from '@/lib/db/client';

type Db = Prisma.TransactionClient | typeof prisma;

export function recordUsedInvite(
  input: { jtiHash: string; orgId: string; email: string; acceptedBy: string },
  db: Db = prisma,
): Promise<UsedInvite> {
  return db.usedInvite.create({ data: input });
}

export function findUsedInvite(
  jtiHash: string,
  db: Db = prisma,
): Promise<UsedInvite | null> {
  return db.usedInvite.findUnique({ where: { jtiHash } });
}
