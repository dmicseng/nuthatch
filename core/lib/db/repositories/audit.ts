import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/client';

type Db = Prisma.TransactionClient | typeof prisma;

export type AuditInput = {
  orgId: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Prisma.InputJsonValue;
};

export function logAudit(input: AuditInput, db: Db = prisma) {
  return db.auditLogEntry.create({
    data: {
      orgId: input.orgId,
      userId: input.userId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      details: input.details ?? {},
    },
  });
}
