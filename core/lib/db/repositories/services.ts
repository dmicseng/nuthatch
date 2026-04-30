import {
  Prisma,
  type BillingCycle,
  type Service,
  type ServiceType,
  type Vendor,
  type VendorCategory,
} from '@prisma/client';
import { prisma } from '@/lib/db/client';
import { logAudit } from './audit';

type Db = Prisma.TransactionClient | typeof prisma;

const DEFAULT_PAGE_SIZE = 10;

export type ServiceListFilters = {
  search?: string;
  vendorCategory?: VendorCategory;
  type?: ServiceType;
  includeInactive?: boolean;
  upcomingOnly?: boolean;
  page?: number;
  pageSize?: number;
};

export type ServiceWithRelations = Service & {
  vendor: Vendor | null;
  owner: { id: string; name: string | null; email: string } | null;
  credential?: { id: string } | null;
};

export type ServiceListResult = {
  items: ServiceWithRelations[];
  total: number;
  page: number;
  pageSize: number;
};

export type CreateServiceInput = {
  vendorId: string | null;
  displayName: string;
  type: ServiceType;
  billingCycle: BillingCycle | null;
  fixedCost: number | string | null;
  currency: string;
  nextRenewal: Date | null;
  ownerUserId: string | null;
  notes: string | null;
};

export type UpdateServiceInput = Partial<CreateServiceInput>;

function buildWhere(orgId: string, filters: ServiceListFilters): Prisma.ServiceWhereInput {
  const where: Prisma.ServiceWhereInput = { orgId };

  if (!filters.includeInactive) {
    where.isActive = true;
  }

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim();
    where.OR = [
      { displayName: { contains: term, mode: 'insensitive' } },
      { notes: { contains: term, mode: 'insensitive' } },
    ];
  }

  if (filters.vendorCategory) {
    where.vendor = { is: { category: filters.vendorCategory } };
  }

  if (filters.upcomingOnly) {
    const now = new Date();
    const cutoff = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    where.nextRenewal = { gte: now, lte: cutoff };
  }

  return where;
}

export async function list(
  orgId: string,
  filters: ServiceListFilters = {},
  db: Db = prisma,
): Promise<ServiceListResult> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const skip = (page - 1) * pageSize;
  const where = buildWhere(orgId, filters);

  const [items, total] = await Promise.all([
    db.service.findMany({
      where,
      include: {
        vendor: true,
        owner: { select: { id: true, name: true, email: true } },
        credential: { select: { id: true } },
      },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: pageSize,
    }),
    db.service.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function get(
  id: string,
  orgId: string,
  db: Db = prisma,
): Promise<ServiceWithRelations | null> {
  const service = await db.service.findFirst({
    where: { id, orgId },
    include: {
      vendor: true,
      owner: { select: { id: true, name: true, email: true } },
    },
  });
  return service;
}

export async function listUpcomingRenewals(
  orgId: string,
  days: number,
  db: Db = prisma,
): Promise<ServiceWithRelations[]> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return db.service.findMany({
    where: {
      orgId,
      isActive: true,
      nextRenewal: { gte: now, lte: cutoff },
    },
    include: {
      vendor: true,
      owner: { select: { id: true, name: true, email: true } },
    },
    orderBy: { nextRenewal: 'asc' },
  });
}

export async function listAllVendors(db: Db = prisma): Promise<Vendor[]> {
  return db.vendor.findMany({ orderBy: { name: 'asc' } });
}

function decimalize(value: number | string | null): Prisma.Decimal | null {
  if (value == null) return null;
  return new Prisma.Decimal(value);
}

export async function create(
  orgId: string,
  input: CreateServiceInput,
  actorUserId: string,
): Promise<Service> {
  return prisma.$transaction(async (tx) => {
    const service = await tx.service.create({
      data: {
        orgId,
        vendorId: input.vendorId,
        displayName: input.displayName,
        type: input.type,
        billingCycle: input.billingCycle,
        fixedCost: decimalize(input.fixedCost ?? null),
        currency: input.currency,
        nextRenewal: input.nextRenewal,
        ownerUserId: input.ownerUserId,
        notes: input.notes,
      },
    });
    await logAudit(
      {
        orgId,
        userId: actorUserId,
        action: 'service.created',
        resourceType: 'service',
        resourceId: service.id,
        details: {
          displayName: service.displayName,
          vendorId: service.vendorId,
          type: service.type,
          fixedCost: service.fixedCost?.toString() ?? null,
          currency: service.currency,
          nextRenewal: service.nextRenewal?.toISOString() ?? null,
        },
      },
      tx,
    );
    return service;
  });
}

export async function update(
  id: string,
  orgId: string,
  input: UpdateServiceInput,
  actorUserId: string,
): Promise<Service> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.service.findFirst({ where: { id, orgId } });
    if (!existing) {
      throw new Error('not_found');
    }

    const data: Prisma.ServiceUpdateInput = {};
    const before: Record<string, string | null> = {};
    const after: Record<string, string | null> = {};
    const changed: string[] = [];

    function diff<K extends keyof CreateServiceInput>(
      key: K,
      currentValue: unknown,
      nextValue: CreateServiceInput[K] | undefined,
      assign: (value: CreateServiceInput[K]) => void,
    ) {
      if (nextValue === undefined) return;
      const a = currentValue == null ? null : currentValue;
      const b = nextValue == null ? null : nextValue;
      const aStr =
        a == null
          ? null
          : a instanceof Date
            ? a.toISOString()
            : a instanceof Prisma.Decimal
              ? a.toString()
              : String(a);
      const bStr =
        b == null
          ? null
          : b instanceof Date
            ? b.toISOString()
            : typeof b === 'number'
              ? String(b)
              : String(b);
      if (aStr === bStr) return;
      changed.push(key);
      before[key] = aStr;
      after[key] = bStr;
      assign(nextValue);
    }

    diff('vendorId', existing.vendorId, input.vendorId, (v) => {
      data.vendor = v ? { connect: { id: v } } : { disconnect: true };
    });
    diff('displayName', existing.displayName, input.displayName, (v) => {
      data.displayName = v;
    });
    diff('type', existing.type, input.type, (v) => {
      data.type = v;
    });
    diff('billingCycle', existing.billingCycle, input.billingCycle, (v) => {
      data.billingCycle = v;
    });
    diff('fixedCost', existing.fixedCost, input.fixedCost, (v) => {
      data.fixedCost = decimalize(v ?? null);
    });
    diff('currency', existing.currency, input.currency, (v) => {
      data.currency = v;
    });
    diff('nextRenewal', existing.nextRenewal, input.nextRenewal, (v) => {
      data.nextRenewal = v;
    });
    diff('ownerUserId', existing.ownerUserId, input.ownerUserId, (v) => {
      data.owner = v ? { connect: { id: v } } : { disconnect: true };
    });
    diff('notes', existing.notes, input.notes, (v) => {
      data.notes = v;
    });

    if (changed.length === 0) {
      return existing;
    }

    const updated = await tx.service.update({
      where: { id },
      data,
    });

    await logAudit(
      {
        orgId,
        userId: actorUserId,
        action: 'service.updated',
        resourceType: 'service',
        resourceId: id,
        details: { changed, before, after },
      },
      tx,
    );

    return updated;
  });
}

// =============================================================================
// Dashboard aggregations
// =============================================================================

function monthRangeUtc(d: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  return { start, end };
}

function ymKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export type MonthlySummary = {
  thisMonthTotal: number;
  thisMonthActual: number;
  thisMonthProjected: number;
  lastMonthTotal: number;
  currency: string;
  activeServicesCount: number;
};

export async function activeServicesCount(orgId: string, db: Db = prisma): Promise<number> {
  return db.service.count({ where: { orgId, isActive: true } });
}

export async function monthlySummary(
  orgId: string,
  now: Date = new Date(),
  db: Db = prisma,
): Promise<MonthlySummary> {
  const { start: thisStart, end: thisEnd } = monthRangeUtc(now);
  const lastAnchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const { start: lastStart, end: lastEnd } = monthRangeUtc(lastAnchor);

  const [thisActualAgg, lastActualAgg, projections, count, sampleService, sampleEvent] =
    await Promise.all([
      db.billingEvent.aggregate({
        where: { service: { orgId }, chargedOn: { gte: thisStart, lt: thisEnd } },
        _sum: { amount: true },
      }),
      db.billingEvent.aggregate({
        where: { service: { orgId }, chargedOn: { gte: lastStart, lt: lastEnd } },
        _sum: { amount: true },
      }),
      db.service.findMany({
        where: {
          orgId,
          isActive: true,
          type: 'subscription',
          nextRenewal: { gte: thisStart, lt: thisEnd },
          billingEvents: { none: { chargedOn: { gte: thisStart, lt: thisEnd } } },
        },
        select: { fixedCost: true, currency: true },
      }),
      db.service.count({ where: { orgId, isActive: true } }),
      db.service.findFirst({
        where: { orgId, isActive: true },
        select: { currency: true },
      }),
      db.billingEvent.findFirst({
        where: { service: { orgId }, chargedOn: { gte: thisStart, lt: thisEnd } },
        select: { currency: true },
      }),
    ]);

  const thisActual = Number(thisActualAgg._sum.amount?.toString() ?? '0');
  const lastTotal = Number(lastActualAgg._sum.amount?.toString() ?? '0');
  const thisProjected = projections.reduce(
    (sum, s) => sum + Number(s.fixedCost?.toString() ?? '0'),
    0,
  );
  const currency = sampleEvent?.currency ?? sampleService?.currency ?? 'USD';

  return {
    thisMonthTotal: thisActual + thisProjected,
    thisMonthActual: thisActual,
    thisMonthProjected: thisProjected,
    lastMonthTotal: lastTotal,
    currency,
    activeServicesCount: count,
  };
}

export type CategoryBreakdownRow = { category: string; total: number };

export async function categoryBreakdown(
  orgId: string,
  now: Date = new Date(),
  db: Db = prisma,
): Promise<CategoryBreakdownRow[]> {
  const { start, end } = monthRangeUtc(now);

  const actualRows = await db.$queryRaw<Array<{ category: string; total: string }>>`
    SELECT COALESCE(v.category::text, 'other') as category,
           COALESCE(SUM(b.amount), 0)::text as total
    FROM billing_events b
    JOIN services s ON s.id = b.service_id
    LEFT JOIN vendors v ON v.id = s.vendor_id
    WHERE s.org_id = ${orgId}
      AND b.charged_on >= ${start}
      AND b.charged_on < ${end}
    GROUP BY 1
  `;

  const projectionRows = await db.$queryRaw<Array<{ category: string; total: string }>>`
    SELECT COALESCE(v.category::text, 'other') as category,
           COALESCE(SUM(s.fixed_cost), 0)::text as total
    FROM services s
    LEFT JOIN vendors v ON v.id = s.vendor_id
    WHERE s.org_id = ${orgId}
      AND s.is_active = true
      AND s.type = 'subscription'
      AND s.next_renewal >= ${start}
      AND s.next_renewal < ${end}
      AND NOT EXISTS (
        SELECT 1 FROM billing_events b
        WHERE b.service_id = s.id AND b.charged_on >= ${start} AND b.charged_on < ${end}
      )
    GROUP BY 1
  `;

  const map = new Map<string, number>();
  for (const r of actualRows) map.set(r.category, (map.get(r.category) ?? 0) + Number(r.total));
  for (const r of projectionRows)
    map.set(r.category, (map.get(r.category) ?? 0) + Number(r.total));

  return Array.from(map.entries())
    .filter(([, total]) => total > 0)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export type MonthlyTrendPoint = {
  month: string;        // 'Jun'
  monthFull: string;    // 'June 2026'
  total: number;
  serviceCount: number;
  isCurrent: boolean;
};

export async function last6MonthsTotals(
  orgId: string,
  now: Date = new Date(),
  db: Db = prisma,
): Promise<MonthlyTrendPoint[]> {
  const months: Array<{ start: Date; end: Date; label: string; full: string }> = [];
  for (let i = 5; i >= 0; i--) {
    const anchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1));
    months.push({
      start: anchor,
      end,
      label: new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(
        anchor,
      ),
      full: new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(anchor),
    });
  }

  const earliest = months[0].start;
  const currentMonth = months[months.length - 1];

  const [actualRows, projections] = await Promise.all([
    db.$queryRaw<Array<{ ym: string; total: string; service_count: bigint }>>`
      SELECT to_char(date_trunc('month', b.charged_on), 'YYYY-MM') as ym,
             COALESCE(SUM(b.amount), 0)::text as total,
             COUNT(DISTINCT b.service_id) as service_count
      FROM billing_events b
      JOIN services s ON s.id = b.service_id
      WHERE s.org_id = ${orgId}
        AND b.charged_on >= ${earliest}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
    db.service.findMany({
      where: {
        orgId,
        isActive: true,
        type: 'subscription',
        nextRenewal: { gte: currentMonth.start, lt: currentMonth.end },
        billingEvents: {
          none: { chargedOn: { gte: currentMonth.start, lt: currentMonth.end } },
        },
      },
      select: { fixedCost: true },
    }),
  ]);

  const actualByMonth = new Map<string, { total: number; serviceCount: number }>();
  for (const r of actualRows) {
    actualByMonth.set(r.ym, {
      total: Number(r.total),
      serviceCount: Number(r.service_count),
    });
  }

  const projectedTotal = projections.reduce(
    (sum, s) => sum + Number(s.fixedCost?.toString() ?? '0'),
    0,
  );

  return months.map((m, idx) => {
    const isCurrent = idx === months.length - 1;
    const key = ymKey(m.start);
    const actual = actualByMonth.get(key);
    return {
      month: m.label,
      monthFull: m.full,
      total: (actual?.total ?? 0) + (isCurrent ? projectedTotal : 0),
      serviceCount: (actual?.serviceCount ?? 0) + (isCurrent ? projections.length : 0),
      isCurrent,
    };
  });
}

export async function deactivate(
  id: string,
  orgId: string,
  actorUserId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.service.findFirst({ where: { id, orgId } });
    if (!existing) {
      throw new Error('not_found');
    }
    if (!existing.isActive) {
      return;
    }
    await tx.service.update({ where: { id }, data: { isActive: false } });
    await logAudit(
      {
        orgId,
        userId: actorUserId,
        action: 'service.deactivated',
        resourceType: 'service',
        resourceId: id,
        details: { displayName: existing.displayName },
      },
      tx,
    );
  });
}
