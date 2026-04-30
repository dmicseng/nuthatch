import { getQueue } from './queue';
import type { SyncJobData } from './types';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

function schedulerId(serviceId: string): string {
  return `sync:${serviceId}`;
}

/**
 * Schedule a recurring daily sync for a service. Random initial offset 0-24h
 * spreads load across the day. Uses BullMQ's job scheduler API; calling this
 * twice for the same service replaces (upserts) the prior schedule.
 */
export async function scheduleRecurring(data: SyncJobData): Promise<void> {
  const q = getQueue();
  const offset = Math.floor(Math.random() * TWENTY_FOUR_HOURS_MS);
  await q.upsertJobScheduler(
    schedulerId(data.serviceId),
    { every: TWENTY_FOUR_HOURS_MS, startDate: new Date(Date.now() + offset) },
    { name: 'sync', data },
  );
}

export async function unschedule(serviceId: string): Promise<void> {
  const q = getQueue();
  await q.removeJobScheduler(schedulerId(serviceId));
}
