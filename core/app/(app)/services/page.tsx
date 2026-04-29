import Link from 'next/link';
import { Plus } from 'lucide-react';
import type { VendorCategory } from '@prisma/client';
import { requireAuth } from '@/lib/auth/middleware';
import { list } from '@/lib/db/repositories/services';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatMoney, formatRelativeDate } from '@/lib/format';
import { ServicesFilters } from './_components/services-filters';
import { ServiceRowActions } from './_components/service-row-actions';
import { ServicesEmptyState } from './_components/empty-state';
import { Pagination } from './_components/pagination';
import { ToastOnMount } from './_components/toast-on-mount';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_CATEGORIES: VendorCategory[] = [
  'cloud',
  'ai',
  'design',
  'comms',
  'dev',
  'finance',
  'other',
];

type SearchParams = {
  search?: string;
  category?: string;
  type?: string;
  include?: string;
  page?: string;
  filter?: string;
  created?: string;
  updated?: string;
};

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireAuth();
  const sp = await searchParams;

  const search = sp.search ?? '';
  const category = sp.category && VALID_CATEGORIES.includes(sp.category as VendorCategory) ? (sp.category as VendorCategory) : undefined;
  const type =
    sp.type === 'subscription' || sp.type === 'usage' ? sp.type : undefined;
  const includeInactive = sp.include === 'all';
  const upcomingOnly = sp.filter === 'upcoming';
  const page = Math.max(1, Number(sp.page ?? '1') || 1);

  const result = await list(session.orgId, {
    search,
    vendorCategory: category,
    type,
    includeInactive,
    upcomingOnly,
    page,
    pageSize: 10,
  });

  const filterActive = Boolean(
    search || category || type || includeInactive || upcomingOnly,
  );

  const passthroughParams: Record<string, string> = {};
  if (search) passthroughParams.search = search;
  if (category) passthroughParams.category = category;
  if (type) passthroughParams.type = type;
  if (includeInactive) passthroughParams.include = 'all';
  if (upcomingOnly) passthroughParams.filter = 'upcoming';

  return (
    <div className="space-y-6">
      {sp.created ? <ToastOnMount message="Service created" /> : null}
      {sp.updated ? <ToastOnMount message="Service updated" /> : null}

      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Services</h1>
          <p className="text-muted-foreground text-sm">
            {result.total} {result.total === 1 ? 'service' : 'services'} tracked
            {upcomingOnly ? ' · renewing in the next 14 days' : ''}
          </p>
        </div>
        <Button asChild>
          <Link href="/services/new">
            <Plus className="size-4" />
            Add service
          </Link>
        </Button>
      </header>

      <ServicesFilters
        search={search}
        category={category ?? ''}
        type={type ?? 'all'}
        includeInactive={includeInactive}
      />

      {result.items.length === 0 ? (
        <ServicesEmptyState filtered={filterActive} />
      ) : (
        <>
          <div className="bg-card overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Next renewal</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((service) => {
                  const dim = !service.isActive;
                  return (
                    <TableRow key={service.id} className={dim ? 'opacity-60' : ''}>
                      <TableCell className="font-medium">
                        {service.vendor ? (
                          <span className="flex items-center gap-2">
                            <span>{service.vendor.name}</span>
                            <span className="text-muted-foreground text-xs uppercase tracking-wide">
                              {service.vendor.category}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">Custom</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/services/${service.id}/edit`}
                          className="hover:text-primary font-medium"
                        >
                          {service.displayName}
                        </Link>
                        {!service.isActive ? (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Deactivated
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant={service.type === 'subscription' ? 'default' : 'secondary'}>
                          {service.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {service.type === 'subscription'
                          ? formatMoney(service.fixedCost?.toString() ?? null, service.currency)
                          : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm capitalize">
                        {service.billingCycle ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {service.nextRenewal ? formatRelativeDate(service.nextRenewal) : '—'}
                      </TableCell>
                      <TableCell>
                        <ServiceRowActions
                          id={service.id}
                          displayName={service.displayName}
                          isActive={service.isActive}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            searchParams={passthroughParams}
          />
        </>
      )}
    </div>
  );
}
