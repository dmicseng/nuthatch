/**
 * Adapter registration manifest. Imported once at app boot via lib/adapters/index.ts.
 * Concrete adapters land in 5C+; in 5B we register only a development mock so the
 * sync runner and credential UI can be verified end-to-end before real adapters exist.
 */
import { env } from '@/lib/env';
import { registerAdapter } from './registry';
import { mockAdapter } from './mock';

if (env.NODE_ENV !== 'production') {
  registerAdapter(mockAdapter);
}

export {};
