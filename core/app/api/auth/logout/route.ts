import { NextResponse } from 'next/server';
import { COOKIE_NAME, sessionCookieOptions, getSessionFromCookies } from '@/lib/auth/session';
import { logAudit } from '@/lib/db/repositories/audit';

export const runtime = 'nodejs';

export async function POST() {
  const session = await getSessionFromCookies();
  if (session) {
    await logAudit({
      orgId: session.orgId,
      userId: session.userId,
      action: 'user.logout',
      resourceType: 'user',
      resourceId: session.userId,
    });
  }
  const res = new NextResponse(null, { status: 204 });
  res.cookies.set(COOKIE_NAME, '', { ...sessionCookieOptions(), maxAge: 0 });
  return res;
}
