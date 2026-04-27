import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { loginSchema } from '@/lib/schemas/auth';
import { login } from '@/lib/auth/handlers';
import { COOKIE_NAME } from '@/lib/auth/session';
import { HttpError } from '@/lib/auth/errors';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = loginSchema.parse(body);
    const result = await login(parsed);
    const res = NextResponse.json({ user: result.user, org: result.org });
    res.cookies.set(COOKIE_NAME, result.token, result.cookieOptions);
    return res;
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'validation_failed' }, { status: 400 });
    }
    if (err instanceof HttpError) return err.toResponse();
    console.error('login error', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
