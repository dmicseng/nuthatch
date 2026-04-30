import {
  GetCostAndUsageCommand,
  type ResultByTime,
} from '@aws-sdk/client-cost-explorer';
import type { AdapterContext, NewBillingEvent, NewUsageSnapshot, SyncResult } from '../types';
import type { AwsCredentials } from './schemas';
import { createCostExplorerClient } from './client';

const FIRST_SYNC_DAYS = 30;
const MAX_HISTORY_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfUtcDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function syncWindow(lastSyncedAt: Date | null, now = new Date()): { start: Date; end: Date } {
  const end = startOfUtcDay(now);
  const earliest = new Date(end.getTime() - MAX_HISTORY_DAYS * MS_PER_DAY);
  let start: Date;
  if (!lastSyncedAt) {
    start = new Date(end.getTime() - FIRST_SYNC_DAYS * MS_PER_DAY);
  } else {
    start = startOfUtcDay(lastSyncedAt);
  }
  if (start < earliest) start = earliest;
  if (start >= end) {
    start = new Date(end.getTime() - MS_PER_DAY);
  }
  return { start, end };
}

export async function syncAws(ctx: AdapterContext<AwsCredentials>): Promise<SyncResult> {
  const { start, end } = syncWindow(ctx.lastSyncedAt);
  const ce = createCostExplorerClient(ctx.credentials);
  const rows: ResultByTime[] = [];
  try {
    let nextToken: string | undefined;
    do {
      const resp = await ce.send(
        new GetCostAndUsageCommand({
          TimePeriod: { Start: ymd(start), End: ymd(end) },
          Granularity: 'DAILY',
          Metrics: ['UnblendedCost'],
          GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
          NextPageToken: nextToken,
        }),
      );
      if (resp.ResultsByTime) rows.push(...resp.ResultsByTime);
      nextToken = resp.NextPageToken;
    } while (nextToken);
  } finally {
    ce.destroy();
  }

  return rowsToSyncResult(rows);
}

/**
 * Pure transformation from CE results to our domain types. Exported for tests.
 */
export function rowsToSyncResult(rows: ResultByTime[]): SyncResult {
  const billingEvents: NewBillingEvent[] = [];
  const usageSnapshots: NewUsageSnapshot[] = [];
  const warnings: string[] = [];
  const seenCurrencies = new Set<string>();

  for (const day of rows) {
    const startStr = day.TimePeriod?.Start;
    if (!startStr) continue;
    const date = new Date(`${startStr}T00:00:00Z`);

    let dayTotal = 0;
    let dayCurrency: string | null = null;

    for (const group of day.Groups ?? []) {
      const serviceName = group.Keys?.[0];
      const cost = group.Metrics?.UnblendedCost;
      if (!serviceName || !cost) continue;
      const amount = parseFloat(cost.Amount ?? '0');
      if (!Number.isFinite(amount) || amount <= 0) continue;
      const unit = (cost.Unit ?? 'USD').toUpperCase();
      seenCurrencies.add(unit);
      dayCurrency = dayCurrency ?? unit;
      dayTotal += amount;

      usageSnapshots.push({
        snapshotDate: date,
        metric: `aws_service:${serviceName}`,
        value: amount.toFixed(4),
        estimatedCost: amount.toFixed(4),
        currency: unit,
      });
    }

    if (dayTotal > 0 && dayCurrency) {
      billingEvents.push({
        chargedOn: date,
        amount: dayTotal.toFixed(4),
        currency: dayCurrency,
        source: 'api',
        externalRef: `aws:${startStr}`,
      });
    }
  }

  if (seenCurrencies.size > 1) {
    warnings.push(
      `AWS returned mixed billing currencies (${[...seenCurrencies].join(', ')}); each event uses its own currency.`,
    );
  }

  return { billingEvents, usageSnapshots, warnings };
}

// Exported for tests.
export const __test__ = { syncWindow };
