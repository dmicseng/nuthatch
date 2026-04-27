import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/client';
import { hashPassword, verifyPassword } from './password';
import { createSession } from './session';
import { hashJti, verifyInviteToken } from './invite';
import { HttpError } from './errors';
import { logAudit } from '@/lib/db/repositories/audit';
import { addMember, createOrgWithOwner, findPrimaryOrg } from '@/lib/db/repositories/orgs';
import { recordUsedInvite, findUsedInvite } from '@/lib/db/repositories/invites';
import { createUser, findByEmail } from '@/lib/db/repositories/users';
import type { SignupInput, LoginInput } from '@/lib/schemas/auth';
import { env } from '@/lib/env';

export type SafeUser = { id: string; email: string; name: string | null };
export type SafeOrg = { id: string; name: string };
export type AuthResult = {
  user: SafeUser;
  org: SafeOrg;
  token: string;
  cookieOptions: Awaited<ReturnType<typeof createSession>>['cookieOptions'];
};

function toSafeUser(user: { id: string; email: string; name: string | null }): SafeUser {
  return { id: user.id, email: user.email, name: user.name };
}

function toSafeOrg(org: { id: string; name: string }): SafeOrg {
  return { id: org.id, name: org.name };
}

export async function signup(input: SignupInput): Promise<AuthResult> {
  if (input.inviteToken) {
    return signupWithInvite(input);
  }
  return signupNewOrg(input);
}

async function signupNewOrg(input: SignupInput): Promise<AuthResult> {
  const existing = await findByEmail(input.email);
  if (existing) throw new HttpError(409, 'email_exists');

  const passwordHash = await hashPassword(input.password);
  const orgName = `${input.name}'s organization`;

  const { user, org } = await prisma.$transaction(async (tx) => {
    const user = await createUser(
      { email: input.email, passwordHash, name: input.name },
      tx,
    );
    const { org } = await createOrgWithOwner({ name: orgName, ownerUserId: user.id }, tx);
    await logAudit(
      {
        orgId: org.id,
        userId: user.id,
        action: 'user.created',
        resourceType: 'user',
        resourceId: user.id,
      },
      tx,
    );
    await logAudit(
      {
        orgId: org.id,
        userId: user.id,
        action: 'org.created',
        resourceType: 'org',
        resourceId: org.id,
      },
      tx,
    );
    await logAudit(
      {
        orgId: org.id,
        userId: user.id,
        action: 'membership.created',
        resourceType: 'membership',
        resourceId: `${org.id}:${user.id}`,
        details: { role: 'owner' },
      },
      tx,
    );
    return { user, org };
  });

  const { token, cookieOptions } = await createSession({ userId: user.id, orgId: org.id });
  return { user: toSafeUser(user), org: toSafeOrg(org), token, cookieOptions };
}

async function signupWithInvite(input: SignupInput): Promise<AuthResult> {
  const invite = await verifyInviteToken(input.inviteToken!);
  if (!invite) throw new HttpError(400, 'invite_invalid_or_expired');
  if (invite.email !== input.email) {
    throw new HttpError(400, 'invite_email_mismatch');
  }

  const jtiHash = hashJti(invite.jti);
  const alreadyUsed = await findUsedInvite(jtiHash);
  if (alreadyUsed) throw new HttpError(400, 'invite_already_used');

  const existing = await findByEmail(input.email);
  if (existing) throw new HttpError(409, 'email_exists');

  const passwordHash = await hashPassword(input.password);

  let user: { id: string; email: string; name: string | null };
  let org: { id: string; name: string };
  try {
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await createUser(
        { email: input.email, passwordHash, name: input.name },
        tx,
      );
      const orgRow = await tx.organization.findUnique({ where: { id: invite.orgId } });
      if (!orgRow) throw new HttpError(400, 'invite_org_missing');
      await addMember({ orgId: invite.orgId, userId: newUser.id, role: invite.role }, tx);
      await recordUsedInvite(
        {
          jtiHash,
          orgId: invite.orgId,
          email: invite.email,
          acceptedBy: newUser.id,
        },
        tx,
      );
      await logAudit(
        {
          orgId: invite.orgId,
          userId: newUser.id,
          action: 'user.created',
          resourceType: 'user',
          resourceId: newUser.id,
        },
        tx,
      );
      await logAudit(
        {
          orgId: invite.orgId,
          userId: newUser.id,
          action: 'membership.created',
          resourceType: 'membership',
          resourceId: `${invite.orgId}:${newUser.id}`,
          details: { role: invite.role, viaInvite: true },
        },
        tx,
      );
      return { user: newUser, org: orgRow };
    });
    user = result.user;
    org = result.org;
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      throw new HttpError(400, 'invite_already_used');
    }
    throw err;
  }

  const { token, cookieOptions } = await createSession({ userId: user.id, orgId: org.id });
  return { user: toSafeUser(user), org: toSafeOrg(org), token, cookieOptions };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await findByEmail(input.email);
  const ok = user
    ? await verifyPassword(input.password, user.passwordHash)
    : false;

  if (!user || !ok) {
    if (user) {
      const primary = await findPrimaryOrg(user.id);
      if (primary) {
        await logAudit({
          orgId: primary.org.id,
          userId: user.id,
          action: 'user.login_failed',
          resourceType: 'user',
          resourceId: user.id,
          details: { email: input.email },
        });
      }
    }
    throw new HttpError(401, 'invalid_credentials');
  }

  const primary = await findPrimaryOrg(user.id);
  if (!primary) throw new HttpError(401, 'invalid_credentials');

  await logAudit({
    orgId: primary.org.id,
    userId: user.id,
    action: 'user.login',
    resourceType: 'user',
    resourceId: user.id,
  });

  const { token, cookieOptions } = await createSession({
    userId: user.id,
    orgId: primary.org.id,
  });
  return {
    user: toSafeUser(user),
    org: toSafeOrg(primary.org),
    token,
    cookieOptions,
  };
}

export async function buildInviteUrl(token: string): Promise<string> {
  const base = env.NUTHATCH_PUBLIC_URL.replace(/\/$/, '');
  return `${base}/signup?invite=${encodeURIComponent(token)}`;
}
