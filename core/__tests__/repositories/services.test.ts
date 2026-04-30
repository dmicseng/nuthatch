import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  create,
  deactivate,
  get,
  list,
  listUpcomingRenewals,
  update,
} from '@/lib/db/repositories/services';
import { resetDb, testPrisma, disconnect } from '../setup/db';
import { createTestOrg } from '../setup/factories';

async function seedFixture() {
  const orgA = await createTestOrg('Org A');
  const orgB = await createTestOrg('Org B');
  const userA = await testPrisma.user.create({
    data: { email: 'a@a.com', passwordHash: 'x' },
  });
  const userB = await testPrisma.user.create({
    data: { email: 'b@b.com', passwordHash: 'x' },
  });
  await testPrisma.membership.createMany({
    data: [
      { orgId: orgA.id, userId: userA.id, role: 'owner' },
      { orgId: orgB.id, userId: userB.id, role: 'owner' },
    ],
  });
  const vendor = await testPrisma.vendor.create({
    data: { slug: 'test-vendor', name: 'Test Vendor', category: 'cloud' },
  });
  return { orgA, orgB, userA, userB, vendor };
}

describe('services repository', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  describe('create', () => {
    it('creates a subscription service and writes service.created audit row', async () => {
      const { orgA, userA, vendor } = await seedFixture();
      const service = await create(
        orgA.id,
        {
          vendorId: vendor.id,
          displayName: 'AWS prod',
          type: 'subscription',
          billingCycle: 'monthly',
          fixedCost: 250,
          currency: 'USD',
          nextRenewal: new Date('2026-06-01'),
          ownerUserId: userA.id,
          notes: null,
        },
        userA.id,
      );

      expect(service.displayName).toBe('AWS prod');
      expect(service.fixedCost?.toString()).toBe('250');
      expect(service.isActive).toBe(true);

      const audits = await testPrisma.auditLogEntry.findMany({
        where: { resourceId: service.id, action: 'service.created' },
      });
      expect(audits).toHaveLength(1);
      expect(audits[0].orgId).toBe(orgA.id);
      expect(audits[0].userId).toBe(userA.id);
    });

    it('creates a usage-based service with no cost/cycle/renewal', async () => {
      const { orgA, userA, vendor } = await seedFixture();
      const service = await create(
        orgA.id,
        {
          vendorId: vendor.id,
          displayName: 'Anthropic API',
          type: 'usage',
          billingCycle: null,
          fixedCost: null,
          currency: 'USD',
          nextRenewal: null,
          ownerUserId: null,
          notes: 'Usage-based',
        },
        userA.id,
      );
      expect(service.type).toBe('usage');
      expect(service.fixedCost).toBeNull();
      expect(service.billingCycle).toBeNull();
    });
  });

  describe('get + org scoping', () => {
    it('returns service for the owning org', async () => {
      const { orgA, userA, vendor } = await seedFixture();
      const created = await create(
        orgA.id,
        {
          vendorId: vendor.id,
          displayName: 'Visible',
          type: 'usage',
          billingCycle: null,
          fixedCost: null,
          currency: 'USD',
          nextRenewal: null,
          ownerUserId: null,
          notes: null,
        },
        userA.id,
      );
      const found = await get(created.id, orgA.id);
      expect(found?.id).toBe(created.id);
    });

    it('returns null when queried from a different org', async () => {
      const { orgA, orgB, userA, vendor } = await seedFixture();
      const created = await create(
        orgA.id,
        {
          vendorId: vendor.id,
          displayName: 'Hidden',
          type: 'usage',
          billingCycle: null,
          fixedCost: null,
          currency: 'USD',
          nextRenewal: null,
          ownerUserId: null,
          notes: null,
        },
        userA.id,
      );
      const found = await get(created.id, orgB.id);
      expect(found).toBeNull();
    });
  });

  describe('list', () => {
    it('only returns services for the requested org', async () => {
      const { orgA, orgB, userA, userB, vendor } = await seedFixture();
      await create(
        orgA.id,
        {
          vendorId: vendor.id,
          displayName: 'A-1',
          type: 'usage',
          billingCycle: null,
          fixedCost: null,
          currency: 'USD',
          nextRenewal: null,
          ownerUserId: null,
          notes: null,
        },
        userA.id,
      );
      await create(
        orgB.id,
        {
          vendorId: vendor.id,
          displayName: 'B-1',
          type: 'usage',
          billingCycle: null,
          fixedCost: null,
          currency: 'USD',
          nextRenewal: null,
          ownerUserId: null,
          notes: null,
        },
        userB.id,
      );

      const aResults = await list(orgA.id, {});
      expect(aResults.items.map((s) => s.displayName)).toEqual(['A-1']);
      const bResults = await list(orgB.id, {});
      expect(bResults.items.map((s) => s.displayName)).toEqual(['B-1']);
    });

    it('hides inactive services by default; reveals with includeInactive', async () => {
      const { orgA, userA, vendor } = await seedFixture();
      const s = await create(
        orgA.id,
        {
          vendorId: vendor.id,
          displayName: 'Will be deactivated',
          type: 'usage',
          billingCycle: null,
          fixedCost: null,
          currency: 'USD',
          nextRenewal: null,
          ownerUserId: null,
          notes: null,
        },
        userA.id,
      );
      await deactivate(s.id, orgA.id, userA.id);

      const visible = await list(orgA.id, {});
      expect(visible.items).toHaveLength(0);

      const all = await list(orgA.id, { includeInactive: true });
      expect(all.items).toHaveLength(1);
    });

    it('search matches displayName and notes case-insensitively', async () => {
      const { orgA, userA, vendor } = await seedFixture();
      await create(
        orgA.id,
        {
          vendorId: vendor.id,
          displayName: 'AWS production',
          type: 'usage',
          billingCycle: null,
          fixedCost: null,
          currency: 'USD',
          nextRenewal: null,
          ownerUserId: null,
          notes: 'Frontend infra',
        },
        userA.id,
      );
      await create(
        orgA.id,
        {
          vendorId: vendor.id,
          displayName: 'Other service',
          type: 'usage',
          billingCycle: null,
          fixedCost: null,
          currency: 'USD',
          nextRenewal: null,
          ownerUserId: null,
          notes: null,
        },
        userA.id,
      );

      const aws = await list(orgA.id, { search: 'aws' });
      expect(aws.items.map((s) => s.displayName)).toEqual(['AWS production']);

      const infra = await list(orgA.id, { search: 'infra' });
      expect(infra.items.map((s) => s.displayName)).toEqual(['AWS production']);
    });
  });

  describe('update', () => {
    it('updates fields and writes service.updated audit with diff', async () => {
      const { orgA, userA, vendor } = await seedFixture();
      const s = await create(
        orgA.id,
        {
          vendorId: vendor.id,
          displayName: 'Old name',
          type: 'subscription',
          billingCycle: 'monthly',
          fixedCost: 100,
          currency: 'USD',
          nextRenewal: new Date('2026-06-01'),
          ownerUserId: null,
          notes: null,
        },
        userA.id,
      );
      const updated = await update(
        s.id,
        orgA.id,
        { displayName: 'New name', fixedCost: 150 },
        userA.id,
      );
      expect(updated.displayName).toBe('New name');
      expect(updated.fixedCost?.toString()).toBe('150');

      const audit = await testPrisma.auditLogEntry.findFirst({
        where: { resourceId: s.id, action: 'service.updated' },
      });
      expect(audit).not.toBeNull();
      const details = audit!.details as { changed: string[]; before: Record<string, unknown>; after: Record<string, unknown> };
      expect(details.changed.sort()).toEqual(['displayName', 'fixedCost']);
      expect(details.before.displayName).toBe('Old name');
      expect(details.after.displayName).toBe('New name');
    });

    it('throws not_found when updating service from another org', async () => {
      const { orgA, orgB, userA, userB, vendor } = await seedFixture();
      const s = await create(
        orgA.id,
        {
          vendorId: vendor.id,
          displayName: 'Org-A service',
          type: 'usage',
          billingCycle: null,
          fixedCost: null,
          currency: 'USD',
          nextRenewal: null,
          ownerUserId: null,
          notes: null,
        },
        userA.id,
      );
      await expect(update(s.id, orgB.id, { displayName: 'Hijack' }, userB.id)).rejects.toThrow('not_found');
    });

    it('writes no audit when nothing actually changed', async () => {
      const { orgA, userA, vendor } = await seedFixture();
      const s = await create(
        orgA.id,
        {
          vendorId: vendor.id,
          displayName: 'Stable',
          type: 'usage',
          billingCycle: null,
          fixedCost: null,
          currency: 'USD',
          nextRenewal: null,
          ownerUserId: null,
          notes: null,
        },
        userA.id,
      );
      await update(s.id, orgA.id, { displayName: 'Stable' }, userA.id);
      const updates = await testPrisma.auditLogEntry.findMany({
        where: { resourceId: s.id, action: 'service.updated' },
      });
      expect(updates).toHaveLength(0);
    });
  });

  describe('deactivate (soft delete)', () => {
    it('sets isActive=false and writes audit; does not hard-delete', async () => {
      const { orgA, userA, vendor } = await seedFixture();
      const s = await create(
        orgA.id,
        {
          vendorId: vendor.id,
          displayName: 'Doomed',
          type: 'usage',
          billingCycle: null,
          fixedCost: null,
          currency: 'USD',
          nextRenewal: null,
          ownerUserId: null,
          notes: null,
        },
        userA.id,
      );
      await deactivate(s.id, orgA.id, userA.id);

      const row = await testPrisma.service.findUnique({ where: { id: s.id } });
      expect(row).not.toBeNull();
      expect(row?.isActive).toBe(false);

      const audit = await testPrisma.auditLogEntry.findFirst({
        where: { resourceId: s.id, action: 'service.deactivated' },
      });
      expect(audit).not.toBeNull();
    });
  });

  describe('listUpcomingRenewals', () => {
    it('returns active services renewing within N days, sorted ascending', async () => {
      const { orgA, userA, vendor } = await seedFixture();
      const today = new Date();
      const inThreeDays = new Date(today);
      inThreeDays.setDate(today.getDate() + 3);
      const inTenDays = new Date(today);
      inTenDays.setDate(today.getDate() + 10);
      const inThirtyDays = new Date(today);
      inThirtyDays.setDate(today.getDate() + 30);

      await create(
        orgA.id,
        {
          vendorId: vendor.id,
          displayName: 'Soon',
          type: 'subscription',
          billingCycle: 'monthly',
          fixedCost: 10,
          currency: 'USD',
          nextRenewal: inThreeDays,
          ownerUserId: null,
          notes: null,
        },
        userA.id,
      );
      await create(
        orgA.id,
        {
          vendorId: vendor.id,
          displayName: 'Later',
          type: 'subscription',
          billingCycle: 'monthly',
          fixedCost: 10,
          currency: 'USD',
          nextRenewal: inTenDays,
          ownerUserId: null,
          notes: null,
        },
        userA.id,
      );
      await create(
        orgA.id,
        {
          vendorId: vendor.id,
          displayName: 'Far',
          type: 'subscription',
          billingCycle: 'monthly',
          fixedCost: 10,
          currency: 'USD',
          nextRenewal: inThirtyDays,
          ownerUserId: null,
          notes: null,
        },
        userA.id,
      );

      const upcoming = await listUpcomingRenewals(orgA.id, 14);
      expect(upcoming.map((s) => s.displayName)).toEqual(['Soon', 'Later']);
    });
  });
});
