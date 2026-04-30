/**
 * Mock adapter for development. Registered against vendorSlug='github' so the
 * GitHub Team service in the dev fixture can be used to manually verify the
 * sync runner. Replaced by a real GitHub adapter (or removed) when concrete
 * adapters land in 5C+.
 */
import { z } from 'zod';
import type { VendorAdapter } from '../types';

const credentialSchema = z.object({
  apiKey: z
    .string()
    .min(8, 'API key must be at least 8 characters')
    .describe('Any value at least 8 chars long; "invalid" simulates a rejected key.'),
  organizationId: z
    .string()
    .optional()
    .describe('Optional org slug, ignored by the mock.'),
});

export const mockAdapter: VendorAdapter<z.infer<typeof credentialSchema>> = {
  vendorSlug: 'github',
  displayName: 'Mock adapter (development only)',
  credentialSchema,
  async validate(creds) {
    if (creds.apiKey === 'invalid') {
      return { ok: false, error: 'Mock rejected the API key.' };
    }
    return {
      ok: true,
      metadata: { account: creds.organizationId ?? 'demo-account-12345' },
    };
  },
  async sync(_ctx) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setUTCDate(today.getUTCDate() - 1);
    const yyyy_mm_dd = yesterday.toISOString().slice(0, 10);
    return {
      billingEvents: [
        {
          chargedOn: yesterday,
          amount: '12.50',
          currency: 'USD',
          source: 'api',
          externalRef: `mock:${yyyy_mm_dd}`,
        },
      ],
      usageSnapshots: [
        {
          snapshotDate: yesterday,
          metric: 'mock:requests',
          value: '1500',
          estimatedCost: '12.50',
          currency: 'USD',
        },
      ],
      warnings: ['Mock adapter — replace with a real implementation in 5C+.'],
    };
  },
};
