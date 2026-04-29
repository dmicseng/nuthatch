import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/client';
import { getSessionFromCookies } from '@/lib/auth/session';
import { Sidebar } from '@/components/app/sidebar';
import { TopNav } from '@/components/app/top-nav';

export const runtime = 'nodejs';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
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
    <div className="bg-background min-h-screen">
      <Sidebar />
      <div className="lg:pl-60">
        <TopNav
          orgName={membership.organization.name}
          user={{ name: user.name, email: user.email }}
          role={membership.role}
        />
        <main className="mx-auto w-full max-w-7xl p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
