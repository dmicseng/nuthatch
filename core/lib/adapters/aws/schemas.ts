import { z } from 'zod';

/**
 * AWS access key IDs follow `AKIA[A-Z0-9]{16}` for long-term IAM users.
 * Temporary STS keys begin with `ASIA` — we accept both prefixes since users
 * may rotate keys via STS in the future.
 */
const ACCESS_KEY_ID_RE = /^(AKIA|ASIA)[A-Z0-9]{16}$/;

export const awsCredentialSchema = z.object({
  accessKeyId: z
    .string()
    .trim()
    .regex(ACCESS_KEY_ID_RE, 'Access Key ID looks malformed (expected AKIA…)')
    .describe('20-character IAM Access Key ID, e.g. AKIA…'),
  secretAccessKey: z
    .string()
    .trim()
    .min(40, 'Secret Access Key looks too short')
    .describe('40-character Secret Access Key. Stored encrypted.'),
  // Strict AWS region format — guards against SSRF via SDK endpoint template
  // substitution. The SDK builds `https://sts.{Region}.amazonaws.com` with no
  // host-label validation, so an unvalidated region containing `.`, `/`, `#`,
  // `:`, `@`, etc. would route the SigV4-signed request to an attacker host.
  region: z
    .string()
    .trim()
    .regex(/^[a-z]{2,3}(?:-[a-z]+){1,2}-\d{1,2}$/, 'Invalid AWS region format (e.g. us-east-1)')
    .optional()
    .describe('AWS region for the API client. Defaults to us-east-1.'),
  accountAlias: z
    .string()
    .trim()
    .max(64)
    .optional()
    .describe('Optional friendly name displayed in Nuthatch.'),
});

export type AwsCredentials = z.infer<typeof awsCredentialSchema>;
