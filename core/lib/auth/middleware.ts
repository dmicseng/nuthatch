import { Role } from '@prisma/client';
import { prisma } from '@/lib/db/client';
import { getSessionFromCookies, type Session } from './session';
import { HttpError } from './errors';

export async function requireAuth(): Promise<Session> {
  const session = await getSessionFromCookies();
  if (!session) throw new HttpError(401, 'unauthenticated');
  return session;
}

export async function requireRole(
  allowedRoles: Role[],
): Promise<Session & { role: Role }> {
  const session = await requireAuth();
  const membership = await prisma.membership.findUnique({
    where: { orgId_userId: { orgId: session.orgId, userId: session.userId } },
    select: { role: true },
  });
  if (!membership) throw new HttpError(403, 'forbidden');
  if (!allowedRoles.includes(membership.role)) {
    throw new HttpError(403, 'forbidden');
  }
  return { ...session, role: membership.role };
}
