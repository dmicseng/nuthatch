'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { requireAuth } from '@/lib/auth/middleware';
import { HttpError } from '@/lib/auth/errors';
import { createServiceSchema, updateServiceSchema } from '@/lib/schemas/service';
import * as services from '@/lib/db/repositories/services';

export type ServiceFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
};

const FIELD_KEYS = [
  'vendorId',
  'displayName',
  'type',
  'billingCycle',
  'fixedCost',
  'currency',
  'nextRenewal',
  'ownerUserId',
  'notes',
] as const;

function toRawInput(formData: FormData): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const key of FIELD_KEYS) {
    const value = formData.get(key);
    if (value === null) {
      raw[key] = null;
      continue;
    }
    const str = value.toString();
    raw[key] = str === '' ? null : str;
  }
  return raw;
}

function zodErrorToFieldErrors(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const path = issue.path[0];
    if (typeof path === 'string' && !out[path]) {
      out[path] = issue.message;
    } else if (path === undefined && !out._form) {
      out._form = issue.message;
    }
  }
  return out;
}

export async function createServiceAction(
  _prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  let serviceId: string | undefined;
  try {
    const session = await requireAuth();
    const parsed = createServiceSchema.parse(toRawInput(formData));
    const created = await services.create(session.orgId, parsed, session.userId);
    serviceId = created.id;
  } catch (err) {
    if (err instanceof ZodError) {
      return { fieldErrors: zodErrorToFieldErrors(err) };
    }
    if (err instanceof HttpError) {
      return { error: err.code };
    }
    console.error('createServiceAction error', err);
    return { error: 'internal_error' };
  }
  revalidatePath('/services');
  revalidatePath('/dashboard');
  redirect(`/services?created=${serviceId}`);
}

export async function updateServiceAction(
  id: string,
  _prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  try {
    const session = await requireAuth();
    const parsed = updateServiceSchema.parse(toRawInput(formData));
    await services.update(id, session.orgId, parsed, session.userId);
  } catch (err) {
    if (err instanceof ZodError) {
      return { fieldErrors: zodErrorToFieldErrors(err) };
    }
    if (err instanceof HttpError) {
      return { error: err.code };
    }
    if (err instanceof Error && err.message === 'not_found') {
      return { error: 'not_found' };
    }
    console.error('updateServiceAction error', err);
    return { error: 'internal_error' };
  }
  revalidatePath('/services');
  revalidatePath(`/services/${id}/edit`);
  revalidatePath('/dashboard');
  redirect(`/services?updated=${id}`);
}

export async function deactivateServiceAction(id: string): Promise<void> {
  const session = await requireAuth();
  try {
    await services.deactivate(id, session.orgId, session.userId);
  } catch (err) {
    if (err instanceof Error && err.message === 'not_found') return;
    throw err;
  }
  revalidatePath('/services');
  revalidatePath('/dashboard');
}
