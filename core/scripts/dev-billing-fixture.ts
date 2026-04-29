/**
 * Dev fixture: seed services + billing events for the first org so the
 * dashboard has something to render. Idempotent — re-runnable.
 *
 * Run with:  npx tsx scripts/dev-billing-fixture.ts
 *
 * Demo rows are tagged via billing_events.external_ref = `demo-...` so they
 * can be filtered out or cleaned up later.
 */
import { PrismaClient, type BillingCycle, type ServiceType } from '@prisma/client';

const prisma = new PrismaClient();

type ServiceDef = {
  vendor: string;
  name: string;
  type: ServiceType;
  cost: number | null;
  cycle: BillingCycle | null;
};

const SERVICE_DEFS: ServiceDef[] = [
  { vendor: 'aws', name: 'AWS production', type: 'subscription', cost: 850, cycle: 'monthly' },
  { vendor: 'vercel', name: 'Vercel Pro', type: 'subscription', cost: 20, cycle: 'monthly' },
  { vendor: 'github', name: 'GitHub Team', type: 'subscription', cost: 44, cycle: 'monthly' },
  { vendor: 'slack', name: 'Slack Pro', type: 'subscription', cost: 168, cycle: 'monthly' },
  { vendor: 'figma', name: 'Figma Org', type: 'subscription', cost: 75, cycle: 'monthly' },
  { vendor: 'linear', name: 'Linear Standard', type: 'subscription', cost: 64, cycle: 'monthly' },
  { vendor: 'openai', name: 'OpenAI API', type: 'usage', cost: null, cycle: null },
  { vendor: 'anthropic', name: 'Anthropic Claude API', type: 'usage', cost: null, cycle: null },
];

async function main() {
  const org = await prisma.organization.findFirst({
    include: { memberships: { where: { role: 'owner' }, take: 1 } },
  });
  if (!org || !org.memberships[0]) {
    console.error('No org with an owner found. Sign up first via /signup.');
    process.exit(1);
  }
  const ownerUserId = org.memberships[0].userId;
  console.log(`Seeding fixture for org "${org.name}" (${org.id})`);

  const vendors = await prisma.vendor.findMany({
    where: { slug: { in: SERVICE_DEFS.map((d) => d.vendor) } },
  });
  const bySlug = new Map(vendors.map((v) => [v.slug, v]));

  const now = new Date();
  const upcomingRenewal = new Date(now);
  upcomingRenewal.setUTCDate(now.getUTCDate() + 3);
  upcomingRenewal.setUTCHours(0, 0, 0, 0);

  let createdServices = 0;
  let createdEvents = 0;

  for (const def of SERVICE_DEFS) {
    const vendor = bySlug.get(def.vendor);
    if (!vendor) {
      console.log(`! vendor ${def.vendor} not found in catalog — skipping`);
      continue;
    }

    let service = await prisma.service.findFirst({
      where: { orgId: org.id, displayName: def.name },
    });

    if (!service) {
      const isUpcomingPick = def.name === 'Vercel Pro' || def.name === 'GitHub Team';
      const midMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 20));
      const nextRenewal =
        def.type === 'subscription' ? (isUpcomingPick ? upcomingRenewal : midMonth) : null;

      service = await prisma.service.create({
        data: {
          orgId: org.id,
          vendorId: vendor.id,
          displayName: def.name,
          type: def.type,
          billingCycle: def.cycle,
          fixedCost: def.cost ?? null,
          currency: 'USD',
          nextRenewal,
          ownerUserId,
          isActive: true,
        },
      });
      createdServices++;
      console.log(`+ service: ${def.name}`);
    }

    // Past 5 months of billing events (skip current month so projections show)
    for (let back = 5; back >= 1; back--) {
      const chargedOn = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 15));
      const externalRef = `demo-${service.id}-m${back}`;

      const existing = await prisma.billingEvent.findFirst({ where: { externalRef } });
      if (existing) continue;

      const amount =
        def.type === 'subscription' && def.cost != null
          ? def.cost * (0.92 + Math.random() * 0.16)
          : 80 + Math.random() * 420;

      await prisma.billingEvent.create({
        data: {
          serviceId: service.id,
          chargedOn,
          amount: amount.toFixed(2),
          currency: 'USD',
          source: 'manual',
          externalRef,
        },
      });
      createdEvents++;
    }

    // Usage services: also add a current-month event so KPI 1 has actuals
    if (def.type === 'usage') {
      const chargedOn = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 5));
      const externalRef = `demo-${service.id}-current`;
      const existing = await prisma.billingEvent.findFirst({ where: { externalRef } });
      if (!existing) {
        const amount = 80 + Math.random() * 420;
        await prisma.billingEvent.create({
          data: {
            serviceId: service.id,
            chargedOn,
            amount: amount.toFixed(2),
            currency: 'USD',
            source: 'manual',
            externalRef,
          },
        });
        createdEvents++;
      }
    }
  }

  // Org-wide budget so KPI 4 isn't "—"
  const budget = await prisma.budget.findFirst({
    where: { orgId: org.id, category: null },
  });
  if (!budget) {
    await prisma.budget.create({
      data: {
        orgId: org.id,
        category: null,
        monthlyLimit: '2000.00',
        currency: 'USD',
        alertThresholdPct: 80,
      },
    });
    console.log('+ org-wide budget: USD 2,000/mo (alert at 80%)');
  }

  console.log(
    `Done. Created ${createdServices} services, ${createdEvents} billing events.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
