import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireAuth } from '@/lib/auth/middleware';
import { listAllVendors } from '@/lib/db/repositories/services';
import { listMembers } from '@/lib/db/repositories/orgs';
import { ServiceForm } from '../_components/service-form';

export const runtime = 'nodejs';

export default async function NewServicePage() {
  const session = await requireAuth();
  const [vendors, memberships] = await Promise.all([
    listAllVendors(),
    listMembers(session.orgId),
  ]);

  const members = memberships.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/services"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-3.5" />
          Services
        </Link>
        <h1 className="mt-1 font-serif text-3xl">New service</h1>
        <p className="text-muted-foreground text-sm">
          Add a SaaS, cloud, or AI service you want to track.
        </p>
      </div>
      <div className="bg-card max-w-2xl rounded-lg border p-6">
        <ServiceForm
          vendors={vendors}
          members={members}
          currentUserId={session.userId}
        />
      </div>
    </div>
  );
}
