'use server';

import { redirect } from 'next/navigation';
import { ZodError } from 'zod';
import { signupSchema } from '@/lib/schemas/auth';
import { signup } from '@/lib/auth/handlers';
import { setSessionCookie } from '@/lib/auth/session';
import { HttpError } from '@/lib/auth/errors';

export type SignupActionState = {
  error?: string;
  fieldErrors?: Partial<Record<'email' | 'password' | 'name', string>>;
};

export async function signupAction(
  _prev: SignupActionState,
  formData: FormData,
): Promise<SignupActionState> {
  const inviteToken = formData.get('inviteToken');
  const raw = {
    email: formData.get('email')?.toString() ?? '',
    password: formData.get('password')?.toString() ?? '',
    name: formData.get('name')?.toString() ?? '',
    inviteToken: typeof inviteToken === 'string' && inviteToken ? inviteToken : undefined,
  };

  try {
    const parsed = signupSchema.parse(raw);
    const result = await signup(parsed);
    await setSessionCookie(result.token, result.cookieOptions);
  } catch (err) {
    if (err instanceof ZodError) {
      const fieldErrors: SignupActionState['fieldErrors'] = {};
      for (const issue of err.issues) {
        const key = issue.path[0];
        if (key === 'email' || key === 'password' || key === 'name') {
          fieldErrors[key] = issue.message;
        }
      }
      return { fieldErrors };
    }
    if (err instanceof HttpError) {
      return { error: err.code };
    }
    console.error('signupAction error', err);
    return { error: 'internal_error' };
  }
  redirect('/dashboard');
}
