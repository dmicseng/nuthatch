import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as signupRoute } from '@/app/api/auth/signup/route';
import { COOKIE_NAME } from '@/lib/auth/session';
import { resetDb, disconnect } from '../setup/db';

const cookieStore = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      const v = cookieStore.get(name);
      return v ? { name, value: v } : undefined;
    },
    set: (name: string, value: string) => {
      cookieStore.set(name, value);
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
  }),
}));

async function freshSignup() {
  cookieStore.clear();
  const res = await signupRoute(
    new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'session@example.com',
        password: 'password123',
        name: 'Session',
      }),
    }),
  );
  const token = res.cookies.get(COOKIE_NAME)?.value;
  if (!token) throw new Error('expected session cookie');
  cookieStore.set(COOKIE_NAME, token);
  return token;
}

describe('session lifecycle', () => {
  beforeEach(async () => {
    await resetDb();
    cookieStore.clear();
  });
  afterAll(async () => {
    await disconnect();
  });

  it('GET /me without cookie returns 401', async () => {
    const { GET: meRoute } = await import('@/app/api/auth/me/route');
    const res = await meRoute();
    expect(res.status).toBe(401);
  });

  it('GET /me with valid cookie returns 200 + user/org/role', async () => {
    await freshSignup();
    const { GET: meRoute } = await import('@/app/api/auth/me/route');
    const res = await meRoute();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.email).toBe('session@example.com');
    expect(body.role).toBe('owner');
  });

  it('logout clears cookie; subsequent /me returns 401', async () => {
    await freshSignup();
    const { POST: logoutRoute } = await import('@/app/api/auth/logout/route');
    const logoutRes = await logoutRoute();
    expect(logoutRes.status).toBe(204);
    cookieStore.delete(COOKIE_NAME);

    const { GET: meRoute } = await import('@/app/api/auth/me/route');
    const meRes = await meRoute();
    expect(meRes.status).toBe(401);
  });
});
