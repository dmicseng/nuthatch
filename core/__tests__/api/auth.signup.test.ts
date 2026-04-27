import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as signupRoute } from '@/app/api/auth/signup/route';
import { COOKIE_NAME } from '@/lib/auth/session';
import { createInviteToken } from '@/lib/auth/invite';
import { resetDb, testPrisma, disconnect } from '../setup/db';

function jsonRequest(body: unknown) {
  return new NextRequest('http://localhost/api/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/signup', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  it('happy path: creates user, org, owner membership, audit rows, sets cookie', async () => {
    const res = await signupRoute(
      jsonRequest({ email: 'alice@example.com', password: 'password123', name: 'Alice' }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.email).toBe('alice@example.com');
    expect(body.org.name).toBe("Alice's organization");

    const cookie = res.cookies.get(COOKIE_NAME);
    expect(cookie?.value).toBeTruthy();
    expect(cookie?.httpOnly).toBe(true);

    const memberships = await testPrisma.membership.findMany();
    expect(memberships).toHaveLength(1);
    expect(memberships[0].role).toBe('owner');

    const audits = await testPrisma.auditLogEntry.findMany({
      orderBy: { occurredAt: 'asc' },
    });
    expect(audits.map((a) => a.action)).toEqual([
      'user.created',
      'org.created',
      'membership.created',
    ]);
  });

  it('returns 409 on duplicate email', async () => {
    await signupRoute(
      jsonRequest({ email: 'dup@example.com', password: 'password123', name: 'A' }),
    );
    const res = await signupRoute(
      jsonRequest({ email: 'dup@example.com', password: 'password123', name: 'B' }),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('email_exists');
  });

  it('returns 400 on weak password', async () => {
    const res = await signupRoute(
      jsonRequest({ email: 'weak@example.com', password: 'short', name: 'A' }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('validation_failed');
  });

  it('with valid invite: joins existing org with invited role', async () => {
    const owner = await testPrisma.user.create({
      data: { email: 'owner@example.com', passwordHash: 'x', name: 'Owner' },
    });
    const org = await testPrisma.organization.create({ data: { name: 'Acme' } });
    await testPrisma.membership.create({
      data: { orgId: org.id, userId: owner.id, role: 'owner' },
    });
    const { token } = await createInviteToken({
      orgId: org.id,
      email: 'newcomer@example.com',
      role: 'member',
    });

    const res = await signupRoute(
      jsonRequest({
        email: 'newcomer@example.com',
        password: 'password123',
        name: 'Newcomer',
        inviteToken: token,
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.org.id).toBe(org.id);

    const memberships = await testPrisma.membership.findMany({
      where: { user: { email: 'newcomer@example.com' } },
    });
    expect(memberships).toHaveLength(1);
    expect(memberships[0].orgId).toBe(org.id);
    expect(memberships[0].role).toBe('member');

    const usedInvites = await testPrisma.usedInvite.findMany();
    expect(usedInvites).toHaveLength(1);
  });

  it('rejects expired invite', async () => {
    const expired =
      'eyJhbGciOiJIUzI1NiJ9.eyJvaWQiOiJvXzEiLCJlbWFpbCI6ImZAZXhhbXBsZS5jb20iLCJyb2xlIjoibWVtYmVyIiwianRpIjoiYWFhIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAxMDB9.invalidsignature';
    const res = await signupRoute(
      jsonRequest({
        email: 'f@example.com',
        password: 'password123',
        name: 'F',
        inviteToken: expired,
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invite_invalid_or_expired');
  });
});
