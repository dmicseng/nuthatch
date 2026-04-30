import IORedis, { type Redis } from 'ioredis';
import { env } from '@/lib/env';

let cached: Redis | null = null;

/**
 * Returns a lazily-initialized ioredis client. BullMQ requires
 * `maxRetriesPerRequest: null` and `enableReadyCheck: false` on the connection
 * shared by Worker (long-poll consumer); we use the same on the producer side
 * for simplicity.
 */
export function getRedis(): Redis {
  if (cached) return cached;
  cached = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  return cached;
}

export async function closeRedis(): Promise<void> {
  if (cached) {
    await cached.quit();
    cached = null;
  }
}
