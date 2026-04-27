import { SignJWT, jwtVerify, errors } from 'jose';
import { createHash, randomUUID } from 'crypto';
import { env } from '@/lib/env';

const INVITE_TTL_SECONDS = 60 * 60 * 24 * 7;
const ALG = 'HS256';

export type InviteRole = 'admin' | 'member' | 'viewer';

export type InvitePayload = {
  orgId: string;
  email: string;
  role: InviteRole;
  jti: string;
};

function secret(): Uint8Array {
  return new TextEncoder().encode(env.NUTHATCH_SECRET_KEY);
}

export function hashJti(jti: string): string {
  return createHash('sha256').update(jti).digest('hex');
}

export async function createInviteToken(input: {
  orgId: string;
  email: string;
  role: InviteRole;
}): Promise<{ token: string; jti: string }> {
  const jti = randomUUID();
  const token = await new SignJWT({
    oid: input.orgId,
    email: input.email,
    role: input.role,
  })
    .setProtectedHeader({ alg: ALG })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(`${INVITE_TTL_SECONDS}s`)
    .sign(secret());
  return { token, jti };
}

export async function verifyInviteToken(token: string): Promise<InvitePayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: [ALG] });
    if (
      typeof payload.oid !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string' ||
      typeof payload.jti !== 'string' ||
      !['admin', 'member', 'viewer'].includes(payload.role)
    ) {
      return null;
    }
    return {
      orgId: payload.oid,
      email: payload.email,
      role: payload.role as InviteRole,
      jti: payload.jti,
    };
  } catch (err) {
    if (
      err instanceof errors.JWTExpired ||
      err instanceof errors.JWTInvalid ||
      err instanceof errors.JWSInvalid ||
      err instanceof errors.JWSSignatureVerificationFailed
    ) {
      return null;
    }
    throw err;
  }
}
