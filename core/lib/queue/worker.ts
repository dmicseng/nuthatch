import { Worker, type Job, type Processor } from 'bullmq';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/client';
import { getAdapter } from '@/lib/adapters/registry';
import * as credentials from '@/lib/db/repositories/credentials';
import { logAudit } from '@/lib/db/repositories/audit';
import { getRedis } from './connection';
import { SYNC_QUEUE_NAME, type SyncJobData, type SyncJobResult } from './types';

const SYNC_TIMEOUT_MS = 60_000;

class SyncTimeoutError extends Error {
  constructor() {
    super('sync_timeout');
    this.name = 'SyncTimeoutError';
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new SyncTimeoutError()), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

function decimalize(v: string | number): Prisma.Decimal | string | number {
  return typeof v === 'number' ? v.toFixed(4) : v;
}

/**
 * Pure processor function: testable in isolation by passing a synthetic Job.
 * Returns the counts the worker reports back to BullMQ.
 */
export async function processSync(job: Job<SyncJobData>): Promise<SyncJobResult> {
  const { serviceId, orgId } = job.data;

  const service = await prisma.service.findFirst({
    where: { id: serviceId, orgId },
    include: { vendor: true },
  });
  if (!service) throw new Error('service_not_found');
  if (!service.vendor) throw new Error('service_has_no_vendor');

  const adapter = getAdapter(service.vendor.slug);
  if (!adapter) throw new Error(`no_adapter_for_${service.vendor.slug}`);

  let creds: Record<string, unknown>;
  try {
    creds = await credentials.retrieve(serviceId, orgId);
  } catch {
    throw new Error('credentials_missing');
  }

  const result = await withTimeout(
    adapter.sync({
      serviceId,
      orgId,
      credentials: creds,
      lastSyncedAt: service.lastSyncedAt,
    }),
    SYNC_TIMEOUT_MS,
  );

  const eventsAdded = result.billingEvents.length;
  const snapshotsAdded = result.usageSnapshots.length;

  await prisma.$transaction(async (tx) => {
    if (eventsAdded > 0) {
      await tx.billingEvent.createMany({
        data: result.billingEvents.map((e) => ({
          serviceId,
          chargedOn: e.chargedOn,
          amount: decimalize(e.amount),
          currency: e.currency,
          source: 'api' as const,
          externalRef: e.externalRef ?? null,
        })),
        skipDuplicates: true,
      });
    }
    if (snapshotsAdded > 0) {
      await tx.usageSnapshot.createMany({
        data: result.usageSnapshots.map((s) => ({
          serviceId,
          snapshotDate: s.snapshotDate,
          metric: s.metric,
          value: decimalize(s.value),
          estimatedCost: s.estimatedCost == null ? null : decimalize(s.estimatedCost),
          currency: s.currency,
        })),
      });
    }
    await tx.service.update({
      where: { id: serviceId },
      data: { lastSyncedAt: new Date(), lastSyncError: null },
    });
    await logAudit(
      {
        orgId,
        userId: null,
        action: 'service.synced',
        resourceType: 'service',
        resourceId: serviceId,
        details: {
          eventsAdded,
          snapshotsAdded,
          warnings: result.warnings,
        },
      },
      tx,
    );
  });

  return { eventsAdded, snapshotsAdded, warnings: result.warnings };
}

/** Persist a final-failure outcome. Called from the Worker `failed` handler
 *  only when no further retries will run. Strips stack traces from the audit. */
export async function recordSyncFailure(
  serviceId: string,
  orgId: string,
  err: Error,
): Promise<void> {
  const message = (err.message ?? 'unknown_error').slice(0, 500);
  await prisma.$transaction(async (tx) => {
    await tx.service.update({
      where: { id: serviceId },
      data: { lastSyncError: message },
    });
    await logAudit(
      {
        orgId,
        userId: null,
        action: 'service.sync_failed',
        resourceType: 'service',
        resourceId: serviceId,
        details: { error: message },
      },
      tx,
    );
  });
}

let cachedWorker: Worker<SyncJobData, SyncJobResult> | null = null;

export function startWorker(): Worker<SyncJobData, SyncJobResult> {
  if (cachedWorker) return cachedWorker;
  const worker = new Worker<SyncJobData, SyncJobResult>(
    SYNC_QUEUE_NAME,
    processSync as Processor<SyncJobData, SyncJobResult>,
    {
      connection: getRedis(),
      concurrency: 4,
    },
  );
  worker.on('failed', async (job, error) => {
    if (!job) return;
    const attempts = job.opts.attempts ?? 1;
    if ((job.attemptsMade ?? 0) < attempts) return;
    try {
      await recordSyncFailure(job.data.serviceId, job.data.orgId, error);
    } catch (e) {
      console.error('[worker] failed to record sync failure', e);
    }
  });
  cachedWorker = worker;
  return worker;
}

export async function closeWorker(): Promise<void> {
  if (cachedWorker) {
    await cachedWorker.close();
    cachedWorker = null;
  }
}
