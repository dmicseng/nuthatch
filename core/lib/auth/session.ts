import { SignJWT, jwtVerify, errors } from 'jose';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';

export const COOKIE_NAME = 'nuthatch_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const ALG = 'HS256';

export type Session = { userId: string; orgId: string };

export type CookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  maxAge: number;
};

function secret(): Uint8Array {
  return new TextEncoder().encode(env.NUTHATCH_SECRET_KEY);
}

export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}

export async function createSession(payload: Session): Promise<{
  token: string;
  cookieOptions: CookieOptions;
}> {
  const token = await new SignJWT({ oid: payload.orgId })
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());

  return { token, cookieOptions: sessionCookieOptions() };
}

export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: [ALG] });
    if (!payload.sub || typeof payload.oid !== 'string') return null;
    return { userId: payload.sub, orgId: payload.oid };
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

export async function getSessionFromCookies(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function setSessionCookie(token: string, options: CookieOptions): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, options);
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, '', {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
}
