import { GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';
import type { ValidateResult } from '../types';
import type { AwsCredentials } from './schemas';
import { createCostExplorerClient, createStsClient } from './client';

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Two probes run in sequence. STS first because it is the authoritative
 * "are these credentials valid" check; we only spend the $0.01 CE probe if
 * STS succeeds.
 */
export async function validateAwsCredentials(
  c: AwsCredentials,
): Promise<ValidateResult> {
  const sts = createStsClient(c);
  let accountId: string;
  try {
    const identity = await sts.send(new GetCallerIdentityCommand({}));
    accountId = identity.Account ?? '';
    if (!accountId) {
      return { ok: false, error: 'STS returned no account id.' };
    }
  } catch (err) {
    return { ok: false, error: friendlyAwsError(err, 'sts') };
  } finally {
    sts.destroy();
  }

  const ce = createCostExplorerClient(c);
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setUTCDate(today.getUTCDate() - 1);
    await ce.send(
      new GetCostAndUsageCommand({
        TimePeriod: { Start: ymd(yesterday), End: ymd(today) },
        Granularity: 'DAILY',
        Metrics: ['UnblendedCost'],
      }),
    );
  } catch (err) {
    return { ok: false, error: friendlyAwsError(err, 'ce') };
  } finally {
    ce.destroy();
  }

  return {
    ok: true,
    metadata: {
      accountId,
      ...(c.accountAlias ? { accountAlias: c.accountAlias } : {}),
      ...(c.region ? { region: c.region } : {}),
    },
  };
}

function friendlyAwsError(err: unknown, source: 'sts' | 'ce'): string {
  if (!(err instanceof Error)) return 'Unknown AWS error.';
  const code = (err as { name?: string; Code?: string }).name ?? '';
  if (code === 'InvalidClientTokenId' || code === 'SignatureDoesNotMatch') {
    return 'Access Key or Secret Access Key is invalid.';
  }
  if (code === 'AccessDenied' || code === 'AccessDeniedException') {
    if (source === 'ce') {
      return 'Credentials are valid but lack ce:GetCostAndUsage permission.';
    }
    return 'Credentials are valid but lack sts:GetCallerIdentity permission.';
  }
  if (code === 'ExpiredToken' || code === 'TokenRefreshRequired') {
    return 'Credentials have expired.';
  }
  return `${code || 'AwsError'}: ${err.message}`;
}
