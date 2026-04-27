import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/client';
import { getSessionFromCookies } from '@/lib/auth/session';
import { LogoutButton } from './logout-button';

export const runtime = 'nodejs';

export default async function DashboardPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect('/login');

  const [user, membership] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true },
    }),
    prisma.membership.findUnique({
      where: {
        orgId_userId: { orgId: session.orgId, userId: session.userId },
      },
      include: { organization: { select: { id: true, name: true } } },
    }),
  ]);

  if (!user || !membership) redirect('/login');

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-12">
          <span className="font-serif italic text-3xl text-[var(--accent-deep)]">
            Nuthatch
          </span>
          <LogoutButton />
        </header>
        <h1 className="text-2xl mb-2">Welcome, {user.name ?? user.email}</h1>
        <p className="text-[var(--text-2)]">
          Organization: <strong>{membership.organization.name}</strong> ({membership.role})
        </p>
      </div>
    </main>
  );
}
