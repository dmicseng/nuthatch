import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import '@/lib/adapters'; // ensure adapters register before getAdapter call
import { getAdapter } from '@/lib/adapters/registry';
import * as credentials from '@/lib/db/repositories/credentials';
import { introspectCredentialSchema } from '@/lib/adapters/introspect';
import { ConnectForm } from './_components/connect-form';
import { ConnectedCard } from './_components/connected-card';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function IntegrationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAuth();
  const service = await prisma.service.findFirst({
    where: { id, orgId: session.orgId },
    include: { vendor: true },
  });
  if (!service) notFound();

  const adapter = service.vendor ? getAdapter(service.vendor.slug) : undefined;
  const isConnected = adapter ? await credentials.exists(id, session.orgId) : false;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/services/${id}/edit`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-3.5" />
          Back to service
        </Link>
        <h1 className="mt-1 font-serif text-3xl">Integration</h1>
        <p className="text-muted-foreground text-sm">
          {service.displayName} ·{' '}
          {service.vendor ? service.vendor.name : 'Custom service'}
        </p>
      </div>

      {!adapter ? (
        <NoAdapterCard vendorName={service.vendor?.name ?? null} />
      ) : isConnected ? (
        <ConnectedCard
          serviceId={id}
          adapterDisplayName={adapter.displayName}
          lastSyncedAt={service.lastSyncedAt}
          lastSyncError={service.lastSyncError}
        />
      ) : (
        <ConnectForm
          serviceId={id}
          adapterDisplayName={adapter.displayName}
          fields={introspectCredentialSchema(adapter.credentialSchema)}
        />
      )}
    </div>
  );
}

function NoAdapterCard({ vendorName }: { vendorName: string | null }) {
  return (
    <div className="bg-card max-w-2xl rounded-lg border p-6">
      <h2 className="font-serif text-lg">No automatic integration</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        {vendorName
          ? `We don't have an adapter for ${vendorName} yet.`
          : `This is a custom service with no vendor selected.`}{' '}
        You can record charges manually from the service edit page.
      </p>
    </div>
  );
}
