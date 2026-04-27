import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as loginRoute } from '@/app/api/auth/login/route';
import { POST as signupRoute } from '@/app/api/auth/signup/route';
import { COOKIE_NAME } from '@/lib/auth/session';
import { resetDb, testPrisma, disconnect } from '../setup/db';

function jsonRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function seedUser(email = 'bob@example.com', password = 'password123') {
  await signupRoute(
    jsonRequest('http://localhost/api/auth/signup', { email, password, name: 'Bob' }),
  );
}

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  it('happy path: returns 200 + cookie + audit row', async () => {
    await seedUser();
    const res = await loginRoute(
      jsonRequest('http://localhost/api/auth/login', {
        email: 'bob@example.com',
        password: 'password123',
      }),
    );
    expect(res.status).toBe(200);
    const cookie = res.cookies.get(COOKIE_NAME);
    expect(cookie?.value).toBeTruthy();

    const audits = await testPrisma.auditLogEntry.findMany({
      where: { action: 'user.login' },
    });
    expect(audits).toHaveLength(1);
  });

  it('wrong password returns 401 and writes audit row', async () => {
    await seedUser();
    const res = await loginRoute(
      jsonRequest('http://localhost/api/auth/login', {
        email: 'bob@example.com',
        password: 'wrong-password',
      }),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('invalid_credentials');

    const failed = await testPrisma.auditLogEntry.findMany({
      where: { action: 'user.login_failed' },
    });
    expect(failed).toHaveLength(1);
  });

  it('nonexistent email returns 401 with same response (no enumeration)', async () => {
    const res = await loginRoute(
      jsonRequest('http://localhost/api/auth/login', {
        email: 'ghost@example.com',
        password: 'whatever',
      }),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('invalid_credentials');
  });
});
