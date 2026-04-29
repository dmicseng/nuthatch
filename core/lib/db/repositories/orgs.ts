import type { Membership, Organization, Prisma, Role } from '@prisma/client';
import { prisma } from '@/lib/db/client';
import { decryptDek, encryptDek, generateDek } from '@/lib/crypto/envelope';

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Returns the org's plaintext DEK. The column is NOT NULL — every org has a
 * DEK provisioned at creation time (createOrgWithOwner). Throws if the org
 * is missing.
 *
 * Caller MUST treat the returned Buffer as sensitive — never log or persist.
 */
export async function loadOrgDek(orgId: string, db: Db = prisma): Promise<Buffer> {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { dekEncrypted: true },
  });
  if (!org) throw new Error('not_found');
  return decryptDek(Buffer.from(org.dekEncrypted));
}

export function createOrgWithOwner(
  input: { name: string; ownerUserId: string },
  db: Db = prisma,
): Promise<{ org: Organization; membership: Membership }> {
  return (async () => {
    const dek = generateDek();
    const dekEncrypted = encryptDek(dek);
    const org = await db.organization.create({
      data: { name: input.name, dekEncrypted },
    });
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
