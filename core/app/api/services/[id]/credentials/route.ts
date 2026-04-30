import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireRole } from '@/lib/auth/middleware';
import { HttpError } from '@/lib/auth/errors';
import { prisma } from '@/lib/db/client';
import '@/lib/adapters'; // side-effect: register all adapters via manifest
import { getAdapter } from '@/lib/adapters/registry';
import * as credentialsRepo from '@/lib/db/repositories/credentials';
import { enqueueSync } from '@/lib/queue/queue';
import { scheduleRecurring, unschedule } from '@/lib/queue/scheduler';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: serviceId } = await params;
    const session = await requireRole(['owner', 'admin']);
    const body = await req.json().catch(() => null);

    const service = await prisma.service.findFirst({
      where: { id: serviceId, orgId: session.orgId },
      include: { vendor: true },
    });
    if (!service) throw new HttpError(404, 'not_found');
    if (!service.vendor) throw new HttpError(400, 'no_vendor');

    const adapter = getAdapter(service.vendor.slug);
    if (!adapter) throw new HttpError(400, 'no_adapter');

    const parsed = adapter.credentialSchema.parse(body);
    const result = await adapter.validate(parsed);
    if (!result.ok) {
      return NextResponse.json(
        { error: 'invalid_credentials', message: result.error },
        { status: 400 },
      );
    }

    await credentialsRepo.store(
      {
        serviceId,
        orgId: session.orgId,
        kind: 'api_key',
        credentials: parsed as Record<string, unknown>,
      },
      session.userId,
    );

    try {
      await scheduleRecurring({ serviceId, orgId: session.orgId });
      await enqueueSync({ serviceId, orgId: session.orgId });
    } catch (err) {
      console.error('credentials POST: failed to schedule sync', err);
    }

    return NextResponse.json({ ok: true, metadata: result.metadata });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'validation_failed', details: err.flatten().fieldErrors },
        { status: 400 },
      );
    }
    if (err instanceof HttpError) return err.toResponse();
    console.error('credentials POST error', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: serviceId } = await params;
    const session = await requireRole(['owner', 'admin']);
    await credentialsRepo.deleteCred(serviceId, session.orgId, session.userId);
    try {
      await unschedule(serviceId);
    } catch (err) {
      console.error('credentials DELETE: failed to unschedule', err);
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof HttpError) return err.toResponse();
    if (err instanceof Error && err.message === 'not_found') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    console.error('credentials DELETE error', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
