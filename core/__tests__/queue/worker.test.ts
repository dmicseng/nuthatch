import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Job } from 'bullmq';
import { z } from 'zod';
import { registerAdapter } from '@/lib/adapters/registry';
import type { VendorAdapter } from '@/lib/adapters/types';
import { processSync, recordSyncFailure } from '@/lib/queue/worker';
import * as credentials from '@/lib/db/repositories/credentials';
import type { SyncJobData } from '@/lib/queue/types';
import { resetDb, testPrisma, disconnect } from '../setup/db';
import { createTestOrg } from '../setup/factories';

const TEST_SLUG = 'worker-test-vendor';

const credSchema = z.object({ apiKey: z.string() });

const baseAdapter: VendorAdapter<z.infer<typeof credSchema>> = {
  vendorSlug: TEST_SLUG,
  displayName: 'Worker Test Vendor',
  credentialSchema: credSchema,
  async validate() {
    return { ok: true };
  },
  async sync() {
    return {
      billingEvents: [
        {
          chargedOn: new Date(Date.UTC(2026, 3, 15)),
          amount: '25.50',
          currency: 'USD',
          source: 'api' as const,
          externalRef: 'test-1',
        },
      ],
      usageSnapshots: [
        {
          snapshotDate: new Date(Date.UTC(2026, 3, 15)),
          metric: 'test:requests',
          value: '100',
          estimatedCost: '25.50',
          currency: 'USD',
        },
      ],
      warnings: ['hello'],
    };
  },
};

let throwingAdapter: VendorAdapter<z.infer<typeof credSchema>> | null = null;

beforeAll(() => {
  registerAdapter(baseAdapter);
});

function mockJob(serviceId: string, orgId: string): Job<SyncJobData> {
  return {
    data: { serviceId, orgId },
    opts: {},
    attemptsMade: 0,
  } as unknown as Job<SyncJobData>;
}

async function seedScenario() {
  const org = await createTestOrg('Org A');
  const user = await testPrisma.user.create({
    data: { email: 'worker@test.com', passwordHash: 'x' },
  });
  await testPrisma.membership.create({
    data: { orgId: org.id, userId: user.id, role: 'owner' },
  });
  const vendor = await testPrisma.vendor.create({
    data: { slug: TEST_SLUG, name: 'Worker Test', category: 'cloud' },
  });
  const service = await testPrisma.service.create({
    data: {
      orgId: org.id,
      vendorId: vendor.id,
      displayName: 'Tracked',
      type: 'usage',
      currency: 'USD',
    },
  });
  return { org, user, service };
}

describe('processSync', () => {
  beforeEach(async () => {
    await resetDb();
    // Restore the base adapter in case a prior test swapped it for a thrower
    registerAdapter(baseAdapter);
    throwingAdapter = null;
  });
  afterAll(async () => {
    await disconnect();
  });

  it('persists events + snapshots, updates lastSyncedAt, audits service.synced', async () => {
    const { org, user, service } = await seedScenario();
    await credentials.store(
      {
        serviceId: service.id,
        orgId: org.id,
        kind: 'api_key',
        credentials: { apiKey: 'whatever' },
      },
      user.id,
    );

    const result = await processSync(mockJob(service.id, org.id));
    expect(result.eventsAdded).toBe(1);
    expect(result.snapshotsAdded).toBe(1);
    expect(result.warnings).toEqual(['hello']);

    const events = await testPrisma.billingEvent.findMany({
      where: { serviceId: service.id },
    });
    expect(events).toHaveLength(1);
    expect(events[0].source).toBe('api');
    expect(events[0].amount.toString()).toBe('25.5');

    const snapshots = await testPrisma.usageSnapshot.findMany({
      where: { serviceId: service.id },
    });
    expect(snapshots).toHaveLength(1);

    const updated = await testPrisma.service.findUnique({
      where: { id: service.id },
    });
    expect(updated?.lastSyncedAt).not.toBeNull();
    expect(updated?.lastSyncError).toBeNull();

    const audit = await testPrisma.auditLogEntry.findFirst({
      where: { resourceId: service.id, action: 'service.synced' },
    });
    expect(audit).not.toBeNull();
    expect(audit?.userId).toBeNull(); // system-initiated
    const details = audit!.details as {
      eventsAdded: number;
      snapshotsAdded: number;
      warnings: string[];
    };
    expect(details.eventsAdded).toBe(1);
    expect(details.snapshotsAdded).toBe(1);
    expect(details.warnings).toEqual(['hello']);
  });

  it('throws credentials_missing when no credential row exists', async () => {
    const { org, service } = await seedScenario();
    await expect(processSync(mockJob(service.id, org.id))).rejects.toThrow(
      'credentials_missing',
    );
  });

  it('throws when service does not belong to the orgId in job data', async () => {
    const { service } = await seedScenario();
    const otherOrg = await createTestOrg('Other');
    await expect(
      processSync(mockJob(service.id, otherOrg.id)),
    ).rejects.toThrow('service_not_found');
  });

  it('skips duplicate billing events on re-sync (skipDuplicates by externalRef)', async () => {
    const { org, user, service } = await seedScenario();
    await credentials.store(
      {
        serviceId: service.id,
        orgId: org.id,
        kind: 'api_key',
        credentials: { apiKey: 'whatever' },
      },
      user.id,
    );
    // Pre-insert a unique externalRef that the adapter will also try to insert
    await testPrisma.billingEvent.create({
      data: {
        serviceId: service.id,
        chargedOn: new Date(Date.UTC(2026, 3, 15)),
        amount: '99.99',
        currency: 'USD',
        source: 'api',
        externalRef: 'test-1',
      },
    });
    // The unique index on (service_id, external_ref) plus createMany's
    // skipDuplicates keeps the pre-existing row and silently drops the
    // adapter's duplicate. The pre-existing amount (99.99) survives.
    await processSync(mockJob(service.id, org.id));
    const events = await testPrisma.billingEvent.findMany({
      where: { serviceId: service.id, externalRef: 'test-1' },
    });
    expect(events).toHaveLength(1);
    expect(events[0].amount.toString()).toBe('99.99');
  });

  it('recordSyncFailure stores error message and audits service.sync_failed', async () => {
    const { org, service } = await seedScenario();
    await recordSyncFailure(service.id, org.id, new Error('upstream rejected key'));
    const updated = await testPrisma.service.findUnique({
      where: { id: service.id },
    });
    expect(updated?.lastSyncError).toBe('upstream rejected key');
    const audit = await testPrisma.auditLogEntry.findFirst({
      where: { resourceId: service.id, action: 'service.sync_failed' },
    });
    expect(audit).not.toBeNull();
    const details = audit!.details as { error: string };
    expect(details.error).toBe('upstream rejected key');
  });

  it('recordSyncFailure truncates very long error messages', async () => {
    const { org, service } = await seedScenario();
    const longMessage = 'x'.repeat(2000);
    await recordSyncFailure(service.id, org.id, new Error(longMessage));
    const updated = await testPrisma.service.findUnique({
      where: { id: service.id },
    });
    expect(updated?.lastSyncError?.length).toBeLessThanOrEqual(500);
  });

  it('throws no_adapter when service vendor has no registered adapter', async () => {
    const orgB = await createTestOrg('Org B');
    const userB = await testPrisma.user.create({
      data: { email: 'b@x.com', passwordHash: 'x' },
    });
    await testPrisma.membership.create({
      data: { orgId: orgB.id, userId: userB.id, role: 'owner' },
    });
    const unknownVendor = await testPrisma.vendor.create({
      data: { slug: 'unregistered-vendor', name: 'Unknown', category: 'cloud' },
    });
    const service = await testPrisma.service.create({
      data: {
        orgId: orgB.id,
        vendorId: unknownVendor.id,
        displayName: 'No adapter',
        type: 'usage',
        currency: 'USD',
      },
    });
    await credentials.store(
      {
        serviceId: service.id,
        orgId: orgB.id,
        kind: 'api_key',
        credentials: { apiKey: 'x' },
      },
      userB.id,
    );
    await expect(processSync(mockJob(service.id, orgB.id))).rejects.toThrow(
      /no_adapter_for_unregistered-vendor/,
    );

    // unused warning suppression
    expect(throwingAdapter).toBeNull();
  });
});
