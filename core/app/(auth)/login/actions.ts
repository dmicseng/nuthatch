'use server';

import { redirect } from 'next/navigation';
import { ZodError } from 'zod';
import { loginSchema } from '@/lib/schemas/auth';
import { login } from '@/lib/auth/handlers';
import { setSessionCookie } from '@/lib/auth/session';
import { HttpError } from '@/lib/auth/errors';

export type LoginActionState = {
  error?: string;
  fieldErrors?: Partial<Record<'email' | 'password', string>>;
};

export async function loginAction(
  _prev: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const raw = {
    email: formData.get('email')?.toString() ?? '',
    password: formData.get('password')?.toString() ?? '',
  };

  try {
    const parsed = loginSchema.parse(raw);
    const result = await login(parsed);
    await setSessionCookie(result.token, result.cookieOptions);
  } catch (err) {
    if (err instanceof ZodError) {
      const fieldErrors: LoginActionState['fieldErrors'] = {};
      for (const issue of err.issues) {
        const key = issue.path[0];
        if (key === 'email' || key === 'password') {
          fieldErrors[key] = issue.message;
        }
      }
      return { fieldErrors };
    }
    if (err instanceof HttpError) {
      return { error: err.code };
    }
    console.error('loginAction error', err);
    return { error: 'internal_error' };
  }
  redirect('/dashboard');
}
