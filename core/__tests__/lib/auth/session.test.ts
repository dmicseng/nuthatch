import { describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';
import { createSession, verifySession } from '@/lib/auth/session';

describe('session token', () => {
  it('round-trips a valid session', async () => {
    const { token } = await createSession({ userId: 'u_1', orgId: 'o_1' });
    const verified = await verifySession(token);
    expect(verified).toEqual({ userId: 'u_1', orgId: 'o_1' });
  });

  it('rejects expired token', async () => {
    const secret = new TextEncoder().encode(process.env.NUTHATCH_SECRET_KEY!);
    const expired = await new SignJWT({ oid: 'o_1' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('u_1')
      .setIssuedAt(Math.floor(Date.now() / 1000) - 1000)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 100)
      .sign(secret);
    expect(await verifySession(expired)).toBeNull();
  });

  it('rejects tampered token', async () => {
    const { token } = await createSession({ userId: 'u_1', orgId: 'o_1' });
    const parts = token.split('.');
    parts[2] = parts[2].replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'));
    const tampered = parts.join('.');
    expect(await verifySession(tampered)).toBeNull();
  });

  it('rejects token signed with wrong secret', async () => {
    const wrong = new TextEncoder().encode('a-different-secret-min-32-chars-here');
    const fake = await new SignJWT({ oid: 'o_1' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('u_1')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(wrong);
    expect(await verifySession(fake)).toBeNull();
  });
});
