import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { requireAuth } from '@/lib/auth/middleware';
import { HttpError } from '@/lib/auth/errors';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await requireAuth();
    const [user, membership] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, email: true, name: true },
      }),
      prisma.membership.findUnique({
        where: {
          orgId_userId: { orgId: session.orgId, userId: session.userId },
        },
        include: {
          organization: { select: { id: true, name: true } },
        },
      }),
    ]);
    if (!user || !membership) throw new HttpError(401, 'unauthenticated');
    return NextResponse.json({
      user,
      org: membership.organization,
      role: membership.role,
    });
  } catch (err) {
    if (err instanceof HttpError) return err.toResponse();
    console.error('me error', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
