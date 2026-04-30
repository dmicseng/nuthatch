import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  CostExplorerClient,
  GetCostAndUsageCommand,
} from '@aws-sdk/client-cost-explorer';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { awsAdapter } from '@/lib/adapters/aws';
import { rowsToSyncResult, __test__ } from '@/lib/adapters/aws/sync';

const ceMock = mockClient(CostExplorerClient);
const stsMock = mockClient(STSClient);

const validCreds = {
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  region: 'us-east-1',
} as const;

beforeEach(() => {
  ceMock.reset();
  stsMock.reset();
});

afterEach(() => {
  ceMock.reset();
  stsMock.reset();
});

describe('aws adapter — credential schema', () => {
  it('rejects malformed access key id', () => {
    const result = awsAdapter.credentialSchema.safeParse({
      accessKeyId: 'shortkey',
      secretAccessKey: 'a'.repeat(40),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['accessKeyId']);
    }
  });

  it('rejects too-short secret', () => {
    const result = awsAdapter.credentialSchema.safeParse({
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'too-short',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid creds with optional region/alias', () => {
    const result = awsAdapter.credentialSchema.safeParse(validCreds);
    expect(result.success).toBe(true);
  });

  it('rejects SSRF region payloads (path injection)', () => {
    const result = awsAdapter.credentialSchema.safeParse({
      ...validCreds,
      region: 'evil.example.com/x',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['region']);
    }
  });

  it('rejects region containing reserved URL characters', () => {
    for (const bad of [
      'us-east-1#',
      'us-east-1?x',
      'us-east-1@host',
      'US-EAST-1',
      'attacker.example.com',
      'us-east-1/',
    ]) {
      const result = awsAdapter.credentialSchema.safeParse({ ...validCreds, region: bad });
      expect(result.success, `expected "${bad}" to be rejected`).toBe(false);
    }
  });

  it('accepts every real AWS region shape', () => {
    for (const ok of [
      'us-east-1',
      'eu-west-3',
      'ap-southeast-2',
      'us-gov-west-1',
      'cn-north-1',
      'me-central-1',
      'sa-east-1',
    ]) {
      const result = awsAdapter.credentialSchema.safeParse({ ...validCreds, region: ok });
      expect(result.success, `expected "${ok}" to be accepted`).toBe(true);
    }
  });
});

describe('aws adapter — validate', () => {
  it('returns ok with accountId when STS + CE succeed', async () => {
    stsMock.on(GetCallerIdentityCommand).resolves({ Account: '123456789012' });
    ceMock.on(GetCostAndUsageCommand).resolves({ ResultsByTime: [] });

    const r = await awsAdapter.validate(validCreds);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.metadata?.accountId).toBe('123456789012');
    }
  });

  it('returns ok=false with friendly message when STS rejects credentials', async () => {
    stsMock.on(GetCallerIdentityCommand).rejects(
      Object.assign(new Error('The security token included in the request is invalid'), {
        name: 'InvalidClientTokenId',
      }),
    );

    const r = await awsAdapter.validate(validCreds);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.toLowerCase()).toContain('invalid');
    }
  });

  it('returns ok=false when CE permission missing', async () => {
    stsMock.on(GetCallerIdentityCommand).resolves({ Account: '123456789012' });
    ceMock.on(GetCostAndUsageCommand).rejects(
      Object.assign(new Error('User is not authorized'), { name: 'AccessDeniedException' }),
    );

    const r = await awsAdapter.validate(validCreds);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.toLowerCase()).toContain('ce:getcostandusage');
    }
  });
});

describe('aws adapter — sync transform (rowsToSyncResult)', () => {
  it('converts CE rows into per-service snapshots and per-day events', () => {
    const result = rowsToSyncResult([
      {
        TimePeriod: { Start: '2026-04-15', End: '2026-04-16' },
        Groups: [
          {
            Keys: ['Amazon Elastic Compute Cloud - Compute'],
            Metrics: { UnblendedCost: { Amount: '12.34', Unit: 'USD' } },
          },
          {
            Keys: ['Amazon Simple Storage Service'],
            Metrics: { UnblendedCost: { Amount: '5.66', Unit: 'USD' } },
          },
        ],
      },
    ]);
    expect(result.usageSnapshots).toHaveLength(2);
    expect(result.billingEvents).toHaveLength(1);
    expect(result.billingEvents[0].externalRef).toBe('aws:2026-04-15');
    expect(result.billingEvents[0].amount).toBe('18.0000');
    expect(result.usageSnapshots[0].metric).toBe(
      'aws_service:Amazon Elastic Compute Cloud - Compute',
    );
    expect(result.warnings).toHaveLength(0);
  });

  it('skips zero-cost groups and zero-cost days', () => {
    const result = rowsToSyncResult([
      {
        TimePeriod: { Start: '2026-04-15', End: '2026-04-16' },
        Groups: [
          {
            Keys: ['Amazon EC2'],
            Metrics: { UnblendedCost: { Amount: '0', Unit: 'USD' } },
          },
        ],
      },
    ]);
    expect(result.billingEvents).toHaveLength(0);
    expect(result.usageSnapshots).toHaveLength(0);
  });

  it('uses CE-supplied currency, not USD when account is non-USD', () => {
    const result = rowsToSyncResult([
      {
        TimePeriod: { Start: '2026-04-15', End: '2026-04-16' },
        Groups: [
          {
            Keys: ['Amazon EC2'],
            Metrics: { UnblendedCost: { Amount: '1234.5', Unit: 'JPY' } },
          },
        ],
      },
    ]);
    expect(result.billingEvents[0].currency).toBe('JPY');
    expect(result.usageSnapshots[0].currency).toBe('JPY');
  });

  it('emits a warning when groups span multiple currencies on the same day', () => {
    const result = rowsToSyncResult([
      {
        TimePeriod: { Start: '2026-04-15', End: '2026-04-16' },
        Groups: [
          {
            Keys: ['Amazon EC2'],
            Metrics: { UnblendedCost: { Amount: '10', Unit: 'USD' } },
          },
          {
            Keys: ['Amazon S3'],
            Metrics: { UnblendedCost: { Amount: '20', Unit: 'EUR' } },
          },
        ],
      },
    ]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('mixed');
  });
});

describe('aws adapter — sync window', () => {
  const fixedNow = new Date('2026-04-30T05:00:00Z');

  it('uses 30-day window on first sync', () => {
    const w = __test__.syncWindow(null, fixedNow);
    const days = (w.end.getTime() - w.start.getTime()) / (24 * 60 * 60 * 1000);
    expect(days).toBe(30);
  });

  it('clamps lastSyncedAt older than 90 days to 90 days back', () => {
    const old = new Date('2025-01-01T00:00:00Z');
    const w = __test__.syncWindow(old, fixedNow);
    const days = (w.end.getTime() - w.start.getTime()) / (24 * 60 * 60 * 1000);
    expect(days).toBe(90);
  });

  it('uses lastSyncedAt as start for incremental sync', () => {
    const last = new Date('2026-04-25T18:30:00Z');
    const w = __test__.syncWindow(last, fixedNow);
    expect(w.start.toISOString()).toBe('2026-04-25T00:00:00.000Z');
    expect(w.end.toISOString()).toBe('2026-04-30T00:00:00.000Z');
  });

  it('falls back to 1-day window when lastSyncedAt is today (no new data)', () => {
    const last = new Date('2026-04-30T03:00:00Z');
    const w = __test__.syncWindow(last, fixedNow);
    const days = (w.end.getTime() - w.start.getTime()) / (24 * 60 * 60 * 1000);
    expect(days).toBe(1);
  });
});

describe('aws adapter — sync end-to-end (mocked CE)', () => {
  it('paginates and merges results across pages', async () => {
    ceMock
      .on(GetCostAndUsageCommand)
      .resolvesOnce({
        ResultsByTime: [
          {
            TimePeriod: { Start: '2026-04-15', End: '2026-04-16' },
            Groups: [
              {
                Keys: ['Amazon EC2'],
                Metrics: { UnblendedCost: { Amount: '10', Unit: 'USD' } },
              },
            ],
          },
        ],
        NextPageToken: 'pg2',
      })
      .resolvesOnce({
        ResultsByTime: [
          {
            TimePeriod: { Start: '2026-04-16', End: '2026-04-17' },
            Groups: [
              {
                Keys: ['Amazon S3'],
                Metrics: { UnblendedCost: { Amount: '5', Unit: 'USD' } },
              },
            ],
          },
        ],
      });

    const result = await awsAdapter.sync({
      serviceId: 'svc_x',
      orgId: 'org_x',
      credentials: validCreds,
      lastSyncedAt: null,
    });

    expect(result.billingEvents).toHaveLength(2);
    expect(result.usageSnapshots).toHaveLength(2);
    const calls = ceMock.commandCalls(GetCostAndUsageCommand);
    expect(calls).toHaveLength(2);
    expect(calls[1].args[0].input.NextPageToken).toBe('pg2');
  });
});
