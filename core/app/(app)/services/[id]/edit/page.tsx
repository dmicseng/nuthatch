import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireAuth } from '@/lib/auth/middleware';
import { get, listAllVendors } from '@/lib/db/repositories/services';
import { listMembers } from '@/lib/db/repositories/orgs';
import { ServiceForm } from '../../_components/service-form';

export const runtime = 'nodejs';

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAuth();
  const service = await get(id, session.orgId);
  if (!service) notFound();

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
        <h1 className="mt-1 font-serif text-3xl">{service.displayName}</h1>
        <p className="text-muted-foreground text-sm">
          {service.vendor ? service.vendor.name : 'Custom service'} ·{' '}
          {service.isActive ? 'Active' : 'Deactivated'}
        </p>
      </div>
      <div className="bg-card max-w-2xl rounded-lg border p-6">
        <ServiceForm
          vendors={vendors}
          members={members}
          currentUserId={session.userId}
          initial={{
            id: service.id,
            vendorId: service.vendorId,
            displayName: service.displayName,
            type: service.type,
            billingCycle: service.billingCycle,
            fixedCost: service.fixedCost?.toString() ?? null,
            currency: service.currency,
            nextRenewal: service.nextRenewal,
            ownerUserId: service.ownerUserId,
            notes: service.notes,
          }}
        />
      </div>
    </div>
  );
}
