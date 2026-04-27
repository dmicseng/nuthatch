import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { inviteSchema } from '@/lib/schemas/auth';
import { requireRole } from '@/lib/auth/middleware';
import { createInviteToken } from '@/lib/auth/invite';
import { buildInviteUrl } from '@/lib/auth/handlers';
import { logAudit } from '@/lib/db/repositories/audit';
import { HttpError } from '@/lib/auth/errors';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(['owner', 'admin']);
    const body = await req.json().catch(() => null);
    const parsed = inviteSchema.parse(body);

    const { token, jti } = await createInviteToken({
      orgId: session.orgId,
      email: parsed.email,
      role: parsed.role,
    });

    await logAudit({
      orgId: session.orgId,
      userId: session.userId,
      action: 'invite.created',
      resourceType: 'invite',
      resourceId: jti,
      details: { email: parsed.email, role: parsed.role },
    });

    const inviteUrl = await buildInviteUrl(token);
    return NextResponse.json({ inviteUrl });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'validation_failed', details: err.flatten().fieldErrors },
        { status: 400 },
      );
    }
    if (err instanceof HttpError) return err.toResponse();
    console.error('invite error', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
