import { CostExplorerClient } from '@aws-sdk/client-cost-explorer';
import { STSClient } from '@aws-sdk/client-sts';
import type { AwsCredentials } from './schemas';

/**
 * Cost Explorer is a global service whose API endpoint lives in us-east-1;
 * the user-provided region is honored for STS but CE always uses us-east-1.
 */
const CE_REGION = 'us-east-1';

function awsCredentialPayload(c: AwsCredentials) {
  return {
    accessKeyId: c.accessKeyId,
    secretAccessKey: c.secretAccessKey,
  };
}

export function createCostExplorerClient(c: AwsCredentials): CostExplorerClient {
  return new CostExplorerClient({
    region: CE_REGION,
    credentials: awsCredentialPayload(c),
  });
}

export function createStsClient(c: AwsCredentials): STSClient {
  return new STSClient({
    region: c.region?.trim() || CE_REGION,
    credentials: awsCredentialPayload(c),
  });
}
