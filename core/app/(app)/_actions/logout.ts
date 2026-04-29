'use server';

import { redirect } from 'next/navigation';
import { clearSessionCookie, getSessionFromCookies } from '@/lib/auth/session';
import { logAudit } from '@/lib/db/repositories/audit';

export async function logoutAction() {
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
  await clearSessionCookie();
  redirect('/login');
}
