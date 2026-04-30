import type { VendorAdapter } from '../types';
import { awsCredentialSchema, type AwsCredentials } from './schemas';
import { validateAwsCredentials } from './validate';
import { syncAws } from './sync';

const AWS_MIN_IAM_POLICY = JSON.stringify(
  {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'NuthatchReadCostAndCallerIdentity',
        Effect: 'Allow',
        Action: ['ce:GetCostAndUsage', 'sts:GetCallerIdentity'],
        Resource: '*',
      },
    ],
  },
  null,
  2,
);

export const awsAdapter: VendorAdapter<AwsCredentials> = {
  vendorSlug: 'aws',
  displayName: 'Amazon Web Services',
  credentialSchema: awsCredentialSchema,
  setupGuide: {
    summary:
      "You'll need a dedicated IAM user with read-only Cost Explorer access. Make sure Cost Explorer is enabled on the account first (Billing → Cost Explorer → Enable).",
    steps: [
      'AWS Console → IAM → Users → Create user. Do NOT enable console access — programmatic only.',
      'On the new user → Add permissions → Create inline policy → JSON, paste the policy below, save it as "nuthatch-readonly".',
      'Same user → Security credentials → Create access key → choose "Application running outside AWS".',
      'Copy the Access Key ID and Secret Access Key into the form below. The secret is shown only once.',
    ],
    policyJson: AWS_MIN_IAM_POLICY,
    docsUrl:
      'https://github.com/dmicseng/nuthatch/blob/main/docs/integrations/aws.md',
  },
  validate: validateAwsCredentials,
  sync: syncAws,
};
