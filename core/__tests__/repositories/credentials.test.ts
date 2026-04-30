import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  deleteCred,
  exists,
  retrieve,
  store,
} from '@/lib/db/repositories/credentials';
import { resetDb, testPrisma, disconnect } from '../setup/db';
import { createTestOrg } from '../setup/factories';

async function seed() {
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
    data: { slug: 'aws', name: 'AWS', category: 'cloud' },
  });
  const serviceA = await testPrisma.service.create({
    data: {
      orgId: orgA.id,
      vendorId: vendor.id,
      displayName: 'AWS Prod',
      type: 'usage',
      currency: 'USD',
    },
  });
  const serviceB = await testPrisma.service.create({
    data: {
      orgId: orgB.id,
      vendorId: vendor.id,
      displayName: 'AWS Other Org',
      type: 'usage',
      currency: 'USD',
    },
  });
  return { orgA, orgB, userA, userB, vendor, serviceA, serviceB };
}

const SAMPLE_CREDS = {
  accessKeyId: 'AKIAEXAMPLE_DISTINCT_MARKER_7g3',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/EXAMPLE_DISTINCT_MARKER_42q',
  region: 'us-east-1',
};

describe('credentials repository', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  it('store + retrieve round-trips a credentials JSON', async () => {
    const { serviceA, orgA, userA } = await seed();
    await store(
      { serviceId: serviceA.id, orgId: orgA.id, kind: 'api_key', credentials: SAMPLE_CREDS },
      userA.id,
    );
    const out = await retrieve(serviceA.id, orgA.id);
    expect(out).toEqual(SAMPLE_CREDS);
  });

  it('encrypted_data row never contains plaintext bytes', async () => {
    const { serviceA, orgA, userA } = await seed();
    await store(
      { serviceId: serviceA.id, orgId: orgA.id, kind: 'api_key', credentials: SAMPLE_CREDS },
      userA.id,
    );
    const row = await testPrisma.credential.findUnique({
      where: { serviceId: serviceA.id },
    });
    expect(row).not.toBeNull();
    const blobAsText = Buffer.from(row!.encryptedData).toString('utf-8');
    expect(blobAsText).not.toContain(SAMPLE_CREDS.accessKeyId);
    expect(blobAsText).not.toContain(SAMPLE_CREDS.secretAccessKey);
  });

  it('first store writes credential.created audit; second store rotates and writes credential.rotated', async () => {
    const { serviceA, orgA, userA } = await seed();
    await store(
      { serviceId: serviceA.id, orgId: orgA.id, kind: 'api_key', credentials: SAMPLE_CREDS },
      userA.id,
    );
    await store(
      {
        serviceId: serviceA.id,
        orgId: orgA.id,
        kind: 'api_key',
        credentials: { ...SAMPLE_CREDS, accessKeyId: 'AKIAEXAMPLE_ROTATED' },
      },
      userA.id,
    );
    const audits = await testPrisma.auditLogEntry.findMany({
      where: { resourceId: serviceA.id, action: { startsWith: 'credential.' } },
      orderBy: { occurredAt: 'asc' },
    });
    expect(audits.map((a) => a.action)).toEqual(['credential.created', 'credential.rotated']);
  });

  it('audit log details NEVER contain plaintext credentials', async () => {
    const { serviceA, orgA, userA } = await seed();
    await store(
      { serviceId: serviceA.id, orgId: orgA.id, kind: 'api_key', credentials: SAMPLE_CREDS },
      userA.id,
    );
    const audits = await testPrisma.auditLogEntry.findMany({
      where: { resourceId: serviceA.id },
    });
    for (const a of audits) {
      const json = JSON.stringify(a.details);
      expect(json).not.toContain(SAMPLE_CREDS.accessKeyId);
      expect(json).not.toContain(SAMPLE_CREDS.secretAccessKey);
    }
  });

  it('store resets last_synced_at and last_sync_error so next sync runs fresh', async () => {
    const { serviceA, orgA, userA } = await seed();
    await testPrisma.service.update({
      where: { id: serviceA.id },
      data: { lastSyncedAt: new Date(), lastSyncError: 'previous failure' },
    });
    await store(
      { serviceId: serviceA.id, orgId: orgA.id, kind: 'api_key', credentials: SAMPLE_CREDS },
      userA.id,
    );
    const after = await testPrisma.service.findUnique({ where: { id: serviceA.id } });
    expect(after?.lastSyncedAt).toBeNull();
    expect(after?.lastSyncError).toBeNull();
  });

  it('refuses to retrieve a credential from a different org', async () => {
    const { serviceA, orgA, orgB, userA } = await seed();
    await store(
      { serviceId: serviceA.id, orgId: orgA.id, kind: 'api_key', credentials: SAMPLE_CREDS },
      userA.id,
    );
    await expect(retrieve(serviceA.id, orgB.id)).rejects.toThrow('not_found');
  });

  it('refuses to store a credential against a service in another org', async () => {
    const { serviceA, orgB, userB } = await seed();
    await expect(
      store(
        {
          serviceId: serviceA.id,
          orgId: orgB.id,
          kind: 'api_key',
          credentials: SAMPLE_CREDS,
        },
        userB.id,
      ),
    ).rejects.toThrow('not_found');
  });

  it('exists() reflects presence without decrypting', async () => {
    const { serviceA, orgA, userA } = await seed();
    expect(await exists(serviceA.id, orgA.id)).toBe(false);
    await store(
      { serviceId: serviceA.id, orgId: orgA.id, kind: 'api_key', credentials: SAMPLE_CREDS },
      userA.id,
    );
    expect(await exists(serviceA.id, orgA.id)).toBe(true);
  });

  it('delete removes the row and writes credential.deleted audit', async () => {
    const { serviceA, orgA, userA } = await seed();
    await store(
      { serviceId: serviceA.id, orgId: orgA.id, kind: 'api_key', credentials: SAMPLE_CREDS },
      userA.id,
    );
    await deleteCred(serviceA.id, orgA.id, userA.id);
    const row = await testPrisma.credential.findUnique({
      where: { serviceId: serviceA.id },
    });
    expect(row).toBeNull();
    const audit = await testPrisma.auditLogEntry.findFirst({
      where: { resourceId: serviceA.id, action: 'credential.deleted' },
    });
    expect(audit).not.toBeNull();
  });

  it('two orgs cannot read each other’s credentials even with the same secret KEK', async () => {
    const { serviceA, serviceB, orgA, orgB, userA, userB } = await seed();
    await store(
      { serviceId: serviceA.id, orgId: orgA.id, kind: 'api_key', credentials: { token: 'A_token' } },
      userA.id,
    );
    await store(
      { serviceId: serviceB.id, orgId: orgB.id, kind: 'api_key', credentials: { token: 'B_token' } },
      userB.id,
    );
    const a = await retrieve(serviceA.id, orgA.id);
    const b = await retrieve(serviceB.id, orgB.id);
    expect(a.token).toBe('A_token');
    expect(b.token).toBe('B_token');
    // Cross-decryption: feeding orgA's encrypted blob to orgB's DEK must fail
    const rowA = await testPrisma.credential.findUnique({
      where: { serviceId: serviceA.id },
    });
    const rowB = await testPrisma.credential.findUnique({
      where: { serviceId: serviceB.id },
    });
    expect(rowA?.encryptedData).not.toEqual(rowB?.encryptedData);
  });
});
