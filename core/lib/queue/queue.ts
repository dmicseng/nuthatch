import { Queue } from 'bullmq';
import { getRedis } from './connection';
import { SYNC_QUEUE_NAME, type SyncJobData } from './types';

let cached: Queue<SyncJobData> | null = null;

export function getQueue(): Queue<SyncJobData> {
  if (cached) return cached;
  cached = new Queue<SyncJobData>(SYNC_QUEUE_NAME, {
    connection: getRedis(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 30_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    },
  });
  return cached;
}

/** Enqueues an immediate sync run (manual "Sync now"). */
export async function enqueueSync(data: SyncJobData): Promise<void> {
  await getQueue().add('sync', data);
}

export async function closeQueue(): Promise<void> {
  if (cached) {
    await cached.close();
    cached = null;
  }
}
