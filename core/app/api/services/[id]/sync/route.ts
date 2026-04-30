import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { HttpError } from '@/lib/auth/errors';
import { prisma } from '@/lib/db/client';
import * as credentials from '@/lib/db/repositories/credentials';
import { enqueueSync } from '@/lib/queue/queue';

export const runtime = 'nodejs';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: serviceId } = await params;
    const session = await requireRole(['owner', 'admin']);
    const service = await prisma.service.findFirst({
      where: { id: serviceId, orgId: session.orgId },
      select: { id: true },
    });
    if (!service) throw new HttpError(404, 'not_found');
    const hasCreds = await credentials.exists(serviceId, session.orgId);
    if (!hasCreds) throw new HttpError(400, 'no_credentials');
    await enqueueSync({ serviceId, orgId: session.orgId });
    return NextResponse.json({ queued: true }, { status: 202 });
  } catch (err) {
    if (err instanceof HttpError) return err.toResponse();
    console.error('sync POST error', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
