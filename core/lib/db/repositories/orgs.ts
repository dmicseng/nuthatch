import type { Membership, Organization, Prisma, Role } from '@prisma/client';
import { prisma } from '@/lib/db/client';

type Db = Prisma.TransactionClient | typeof prisma;

export function createOrgWithOwner(
  input: { name: string; ownerUserId: string },
  db: Db = prisma,
): Promise<{ org: Organization; membership: Membership }> {
  return (async () => {
    const org = await db.organization.create({ data: { name: input.name } });
    const membership = await db.membership.create({
      data: { orgId: org.id, userId: input.ownerUserId, role: 'owner' },
    });
    return { org, membership };
  })();
}

export function addMember(
  input: { orgId: string; userId: string; role: Role },
  db: Db = prisma,
): Promise<Membership> {
  return db.membership.create({
    data: { orgId: input.orgId, userId: input.userId, role: input.role },
  });
}

const ROLE_ORDER: Record<Role, number> = {
  owner: 0,
  admin: 1,
  member: 2,
  viewer: 3,
};

export async function findPrimaryOrg(
  userId: string,
  db: Db = prisma,
): Promise<{ org: Organization; role: Role } | null> {
  const memberships = await db.membership.findMany({
    where: { userId },
    include: { organization: true },
    orderBy: { createdAt: 'asc' },
  });
  if (memberships.length === 0) return null;
  memberships.sort((a, b) => {
    const roleDiff = ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
    if (roleDiff !== 0) return roleDiff;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  const primary = memberships[0];
  return { org: primary.organization, role: primary.role };
}

export function listMembers(orgId: string, db: Db = prisma) {
  return db.membership.findMany({
    where: { orgId },
    include: { user: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  });
}
