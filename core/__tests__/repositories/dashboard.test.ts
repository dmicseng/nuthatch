import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  activeServicesCount,
  categoryBreakdown,
  create,
  last6MonthsTotals,
  monthlySummary,
} from '@/lib/db/repositories/services';
import { resetDb, testPrisma, disconnect } from '../setup/db';

async function seed() {
  const orgA = await testPrisma.organization.create({ data: { name: 'Org A' } });
  const orgB = await testPrisma.organization.create({ data: { name: 'Org B' } });
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
  const cloudVendor = await testPrisma.vendor.create({
    data: { slug: 'aws', name: 'AWS', category: 'cloud' },
  });
  const aiVendor = await testPrisma.vendor.create({
    data: { slug: 'openai', name: 'OpenAI', category: 'ai' },
  });
  return { orgA, orgB, userA, userB, cloudVendor, aiVendor };
}

function utcMidnight(year: number, month0: number, day: number): Date {
  return new Date(Date.UTC(year, month0, day));
}

describe('dashboard aggregations', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  describe('activeServicesCount', () => {
    it('counts only active services in the org', async () => {
      const { orgA, orgB, userA, userB, cloudVendor } = await seed();
      await create(
        orgA.id,
        {
          vendorId: cloudVendor.id,
          displayName: 'A1',
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
      const a2 = await create(
        orgA.id,
        {
          vendorId: cloudVendor.id,
          displayName: 'A2',
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
      await testPrisma.service.update({
        where: { id: a2.id },
        data: { isActive: false },
      });
      await create(
        orgB.id,
        {
          vendorId: cloudVendor.id,
          displayName: 'B1',
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

      expect(await activeServicesCount(orgA.id)).toBe(1);
      expect(await activeServicesCount(orgB.id)).toBe(1);
    });
  });

  describe('monthlySummary', () => {
    it('sums billing_events for this and last month, separates actual vs projected', async () => {
      const { orgA, userA, cloudVendor } = await seed();
      const now = new Date();
      const thisMonth = utcMidnight(now.getUTCFullYear(), now.getUTCMonth(), 5);
      const lastMonth = utcMidnight(now.getUTCFullYear(), now.getUTCMonth() - 1, 15);
      const renewalThisMonth = utcMidnight(now.getUTCFullYear(), now.getUTCMonth(), 25);

      const billed = await create(
        orgA.id,
        {
          vendorId: cloudVendor.id,
          displayName: 'Billed sub',
          type: 'subscription',
          billingCycle: 'monthly',
          fixedCost: 100,
          currency: 'USD',
          nextRenewal: renewalThisMonth,
          ownerUserId: null,
          notes: null,
        },
        userA.id,
      );
      const projected = await create(
        orgA.id,
        {
          vendorId: cloudVendor.id,
          displayName: 'Projected sub',
          type: 'subscription',
          billingCycle: 'monthly',
          fixedCost: 200,
          currency: 'USD',
          nextRenewal: renewalThisMonth,
          ownerUserId: null,
          notes: null,
        },
        userA.id,
      );

      // Billed sub already has a charge this month
      await testPrisma.billingEvent.create({
        data: {
          serviceId: billed.id,
          chargedOn: thisMonth,
          amount: '100',
          currency: 'USD',
          source: 'manual',
        },
      });
      // Last month event for separate service
      await testPrisma.billingEvent.create({
        data: {
          serviceId: billed.id,
          chargedOn: lastMonth,
          amount: '90',
          currency: 'USD',
          source: 'manual',
        },
      });

      const summary = await monthlySummary(orgA.id, now);
      expect(summary.thisMonthActual).toBe(100);
      expect(summary.thisMonthProjected).toBe(200); // projected sub not yet billed
      expect(summary.thisMonthTotal).toBe(300);
      expect(summary.lastMonthTotal).toBe(90);
      expect(summary.activeServicesCount).toBe(2);
      expect(summary.currency).toBe('USD');

      // Suppress unused var warning — projected exists for setup
      expect(projected.id).toBeTruthy();
    });

    it('excludes data from other orgs', async () => {
      const { orgA, orgB, userB, cloudVendor } = await seed();
      const now = new Date();
      const renewalThisMonth = utcMidnight(now.getUTCFullYear(), now.getUTCMonth(), 25);
      await create(
        orgB.id,
        {
          vendorId: cloudVendor.id,
          displayName: 'B-sub',
          type: 'subscription',
          billingCycle: 'monthly',
          fixedCost: 999,
          currency: 'USD',
          nextRenewal: renewalThisMonth,
          ownerUserId: null,
          notes: null,
        },
        userB.id,
      );
      const summary = await monthlySummary(orgA.id, now);
      expect(summary.thisMonthTotal).toBe(0);
      expect(summary.activeServicesCount).toBe(0);
    });
  });

  describe('categoryBreakdown', () => {
    it('groups spend by vendor category for the month', async () => {
      const { orgA, userA, cloudVendor, aiVendor } = await seed();
      const now = new Date();
      const inMonth = utcMidnight(now.getUTCFullYear(), now.getUTCMonth(), 10);
      const renewalInMonth = utcMidnight(now.getUTCFullYear(), now.getUTCMonth(), 28);

      const aws = await create(
        orgA.id,
        {
          vendorId: cloudVendor.id,
          displayName: 'AWS',
          type: 'subscription',
          billingCycle: 'monthly',
          fixedCost: 500,
          currency: 'USD',
          nextRenewal: renewalInMonth,
          ownerUserId: null,
          notes: null,
        },
        userA.id,
      );
      // AWS billed this month -> goes to 'cloud' actuals
      await testPrisma.billingEvent.create({
        data: {
          serviceId: aws.id,
          chargedOn: inMonth,
          amount: '500',
          currency: 'USD',
          source: 'manual',
        },
      });
      // OpenAI sub renewing this month, not billed yet -> 'ai' projection
      await create(
        orgA.id,
        {
          vendorId: aiVendor.id,
          displayName: 'OpenAI',
          type: 'subscription',
          billingCycle: 'monthly',
          fixedCost: 200,
          currency: 'USD',
          nextRenewal: renewalInMonth,
          ownerUserId: null,
          notes: null,
        },
        userA.id,
      );
      // Custom service (no vendor) with billing event -> 'other'
      const custom = await create(
        orgA.id,
        {
          vendorId: null,
          displayName: 'Custom thing',
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
      await testPrisma.billingEvent.create({
        data: {
          serviceId: custom.id,
          chargedOn: inMonth,
          amount: '50',
          currency: 'USD',
          source: 'manual',
        },
      });

      const breakdown = await categoryBreakdown(orgA.id, now);
      const map = new Map(breakdown.map((r) => [r.category, r.total]));
      expect(map.get('cloud')).toBe(500);
      expect(map.get('ai')).toBe(200);
      expect(map.get('other')).toBe(50);
      // Sorted desc
      expect(breakdown.map((r) => r.category)).toEqual(['cloud', 'ai', 'other']);
    });
  });

  describe('last6MonthsTotals', () => {
    it('returns 6 points oldest-first, fills missing months with zero', async () => {
      const { orgA, userA, cloudVendor } = await seed();
      const now = new Date();
      const threeMonthsAgo = utcMidnight(now.getUTCFullYear(), now.getUTCMonth() - 3, 10);

      const svc = await create(
        orgA.id,
        {
          vendorId: cloudVendor.id,
          displayName: 'X',
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
      await testPrisma.billingEvent.create({
        data: {
          serviceId: svc.id,
          chargedOn: threeMonthsAgo,
          amount: '321',
          currency: 'USD',
          source: 'manual',
        },
      });

      const trend = await last6MonthsTotals(orgA.id, now);
      expect(trend).toHaveLength(6);
      expect(trend[5].isCurrent).toBe(true);
      expect(trend[2].total).toBe(321); // 3 months ago = index 2 (5,4,3,2,1,0 from oldest)
      expect(trend[5].total).toBe(0);
    });

    it('current month includes both actuals and projections', async () => {
      const { orgA, userA, cloudVendor } = await seed();
      const now = new Date();
      const inMonth = utcMidnight(now.getUTCFullYear(), now.getUTCMonth(), 10);
      const renewalInMonth = utcMidnight(now.getUTCFullYear(), now.getUTCMonth(), 28);

      const billed = await create(
        orgA.id,
        {
          vendorId: cloudVendor.id,
          displayName: 'Billed',
          type: 'subscription',
          billingCycle: 'monthly',
          fixedCost: 100,
          currency: 'USD',
          nextRenewal: renewalInMonth,
          ownerUserId: null,
          notes: null,
        },
        userA.id,
      );
      await testPrisma.billingEvent.create({
        data: {
          serviceId: billed.id,
          chargedOn: inMonth,
          amount: '100',
          currency: 'USD',
          source: 'manual',
        },
      });
      await create(
        orgA.id,
        {
          vendorId: cloudVendor.id,
          displayName: 'Projected',
          type: 'subscription',
          billingCycle: 'monthly',
          fixedCost: 50,
          currency: 'USD',
          nextRenewal: renewalInMonth,
          ownerUserId: null,
          notes: null,
        },
        userA.id,
      );

      const trend = await last6MonthsTotals(orgA.id, now);
      const current = trend[trend.length - 1];
      expect(current.total).toBe(150);
      expect(current.serviceCount).toBe(2);
    });
  });
});
