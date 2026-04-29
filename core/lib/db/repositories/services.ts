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
