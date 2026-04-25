# Project: Nuthatch

Self-hosted cost tracker for teams. One dashboard for SaaS, cloud, AI spend.

## Stack
- Next.js 16 (App Router) + TypeScript strict mode
- Prisma + PostgreSQL
- Redis + BullMQ for background jobs  
- shadcn/ui + Tailwind CSS
- Vitest for tests

## Conventions
- Files: kebab-case.ts
- Exports: camelCase / PascalCase for types  
- Zod schemas in `lib/schemas/`, co-located with usage
- Server Components by default, `'use client'` only when needed
- API routes return plain JSON errors (not Next.js error pages)
- Never log secrets or PII — use structured logging
- All DB writes go through repositories in `lib/repositories/`, not direct Prisma
  calls from routes
- Audit log entries for every mutation that touches services/credentials

## Do NOT
- Add telemetry/analytics/phone-home (breaks self-host promise)
- Introduce dependencies that require a paid third-party service
- Break the docker-compose.yml quick-start path
- Write to /core/ top-level files without asking

## Branding (for UI)
- Primary bg: #f5f0e6 (warm cream)
- Accent: #a8743c (ochre)  
- Deep: #2b3d4f (slate blue)
- Display font: Instrument Serif
- Body: Geist
