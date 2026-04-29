import type { Budget, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/client';

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Returns the org-wide budget (category = null) for KPI display, or null.
 * If multiple org-wide budgets exist, picks the most recently updated one.
 */
export function getOrgBudget(orgId: string, db: Db = prisma): Promise<Budget | null> {
  return db.budget.findFirst({
    where: { orgId, category: null },
    orderBy: { updatedAt: 'desc' },
  });
}
