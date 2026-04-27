import { NextResponse } from 'next/server';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    public details?: unknown,
  ) {
    super(code);
    this.name = 'HttpError';
  }

  toResponse(): NextResponse {
    const body: Record<string, unknown> = { error: this.code };
    if (this.details !== undefined) body.details = this.details;
    return NextResponse.json(body, { status: this.status });
  }
}
