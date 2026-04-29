import type { z } from 'zod';

/**
 * Subset of BillingEvent that an adapter produces during sync.
 * orgId/serviceId are filled in by the runner; source is locked to 'api'.
 */
export type NewBillingEvent = {
  chargedOn: Date;
  amount: string | number;
  currency: string;
  source: 'api';
  externalRef?: string | null;
};

/** Subset of UsageSnapshot that an adapter produces during sync. */
export type NewUsageSnapshot = {
  snapshotDate: Date;
  metric: string;
  value: string | number;
  estimatedCost?: string | number | null;
  currency: string;
};

export type SyncResult = {
  billingEvents: NewBillingEvent[];
  usageSnapshots: NewUsageSnapshot[];
  warnings: string[];
};

export type ValidateResult =
  | { ok: true; metadata?: Record<string, string> }
  | { ok: false; error: string };

export type AdapterContext<TCreds = Record<string, unknown>> = {
  serviceId: string;
  orgId: string;
  /** Decrypted credentials, runtime-only — DO NOT log or persist. */
  credentials: TCreds;
  lastSyncedAt: Date | null;
};

/**
 * Contract for vendor integration adapters. Each implementation is registered
 * in `lib/adapters/manifest.ts`. The runner is responsible for:
 *   - Decrypting credentials before calling validate/sync
 *   - Persisting returned billing events / usage snapshots
 *   - Updating service.lastSyncedAt and lastSyncError
 */
export interface VendorAdapter<TCreds = Record<string, unknown>> {
  /** Must match a row in the `vendors` table by slug. */
  vendorSlug: string;
  /** Human-friendly name shown in UI when offering the integration. */
  displayName: string;
  /** Zod schema used to render the credential form and validate input. */
  credentialSchema: z.ZodType<TCreds>;
  /**
   * Lightweight call to verify the credentials work before storing them.
   * Should NOT pull data — just confirm the API accepts the credentials and
   * the IAM/key has the minimum required scope.
   */
  validate(credentials: TCreds): Promise<ValidateResult>;
  /** Pull data since lastSyncedAt and return things the runner will persist. */
  sync(ctx: AdapterContext<TCreds>): Promise<SyncResult>;
}
