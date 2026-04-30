/**
 * Worker process entry point.
 * Run with `npm run worker` (one-shot) or `npm run worker:dev` (with --watch).
 * Production docker-compose.yml will run the compiled bundle.
 *
 * `dotenv/config` MUST be the first import — env validation in `lib/env.ts`
 * runs at module load of anything that touches the env (e.g. adapters/manifest).
 */
import 'dotenv/config';
import '@/lib/adapters'; // side-effect import: register all adapters
import { startWorker, closeWorker } from '@/lib/queue/worker';
import { closeQueue } from '@/lib/queue/queue';
import { closeRedis } from '@/lib/queue/connection';

const worker = startWorker();
console.log('[worker] vendor-sync worker started, concurrency 4');

worker.on('ready', () => console.log('[worker] redis connection ready'));
worker.on('completed', (job, result) => {
  console.log(
    `[worker] completed ${job.id} service=${job.data.serviceId} events=${result.eventsAdded} snapshots=${result.snapshotsAdded}`,
  );
});
worker.on('failed', (job, err) => {
  const attempts = job?.opts.attempts ?? 1;
  const made = job?.attemptsMade ?? 0;
  console.error(
    `[worker] failed ${job?.id} service=${job?.data.serviceId} attempt=${made}/${attempts}: ${err.message}`,
  );
});
worker.on('error', (err) => {
  console.error('[worker] error event', err.message);
});

async function shutdown(signal: string) {
  console.log(`[worker] received ${signal}, draining...`);
  try {
    await closeWorker();
    await closeQueue();
    await closeRedis();
  } catch (e) {
    console.error('[worker] shutdown error', e);
  }
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
