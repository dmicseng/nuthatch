# Nuthatch — project rules for Claude Code

Read this first every session. These rules keep code consistent and protect the self-host promise.

## Product

Nuthatch is a **self-hosted cost tracker for teams**. One dashboard for SaaS subscriptions, cloud usage, and AI API spend. Open source under AGPL v3.

Target user: SME teams of 5–50 people who want full cost visibility on their own infrastructure.

See `README.md` for full positioning.

## Stack

- **Runtime**: Node.js 20+, TypeScript 5.x (strict mode — no `any`, no `@ts-ignore` without comment)
- **Framework**: Next.js 16 (App Router), React 19, Server Components by default
- **Styling**: Tailwind CSS + shadcn/ui (brand palette below)
- **DB**: PostgreSQL 16 + Prisma ORM
- **Queue**: Redis 7 + BullMQ
- **Auth**: Custom JWT in HTTP-only cookies (not NextAuth)
- **Validation**: Zod for all external input (API bodies, env vars, form data)
- **Testing**: Vitest for unit/integration, Playwright for E2E (later)
- **Deploy target**: Docker Compose on a $5/mo VPS

## Folder structure (after Prompt 1 scaffolds)

```
nuthatch/
├── core/                 # The Next.js app (most work happens here)
│   ├── app/              # App Router pages + API routes
│   ├── lib/              # Shared utilities
│   │   ├── auth/         # Auth helpers
│   │   ├── db/           # Prisma client + repositories
│   │   ├── schemas/      # Zod schemas
│   │   └── crypto/       # Envelope encryption helpers
│   ├── components/       # React components
│   │   └── ui/           # shadcn/ui components
│   ├── prisma/           # schema.prisma + migrations
│   └── __tests__/
├── plugins/              # Vendor parsers + API adapters (community contribution area)
│   └── parsers/
├── docs/                 # User-facing docs (self-host guide, API ref)
├── docker-compose.yml    # Production deploy (users run this)
├── docker-compose.dev.yml # Local dev (Postgres + Redis only, app runs on host)
└── .claude/              # This folder
```

## Conventions

### Naming
- Files: `kebab-case.ts` (e.g. `billing-event.ts`)
- Functions/variables: `camelCase`
- Types/interfaces: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- DB columns: `snake_case`, Prisma client: `camelCase` (use `@map` directive)

### Code patterns
- **Server Components by default**. Use `'use client'` only when interactivity needs it.
- **Repositories own DB access**. Routes and server actions call `lib/db/repositories/*`, never Prisma directly.
- **Zod validates every external input**. Keep schemas in `lib/schemas/`, co-located with usage.
- **Plain JSON errors from API routes**. Return `{ error: string, code: string }`, not Next.js error pages.
- **Audit every mutation** of `services`, `credentials`, `budgets`, `memberships`. Write to `audit_log` table in the same transaction.

### Testing
- Every API route has at least a smoke test (happy path + auth failure).
- Encryption helpers have unit tests (round-trip encrypt/decrypt).
- Repositories have integration tests against real Postgres (use `docker-compose.dev.yml`).
- Run `npm test` before committing.

### Error handling
- API routes: wrap handler body in try/catch, return Zod errors as 400, auth failures as 401, not-found as 404, everything else as 500 (log the original).
- Never leak internal error details to client. Log full details server-side only.
- Never log secrets, passwords, tokens, PII.

## Branding (when generating UI)

### Colors (CSS variables, match `nuthatch-landing.html`)
```
--bg: #f5f0e6         warm cream
--surface: #fbf8f1    lighter cream
--text-1: #1c1a15     near-black
--accent-deep: #2b3d4f slate blue (nuthatch crown)
--accent-warm: #a8743c ochre (nuthatch belly) — primary CTA color
--border: #d9d0bf     warm stone
```

Rule: ochre for primary CTAs and highlights, slate for structural accents, everything else cream + near-black.

### Typography
- Display: `Instrument Serif` (italic for emphasis)
- Body: `Geist`
- Mono: `JetBrains Mono`

Max 2 weights per font. No weight 700 or 800.

### Voice
- Quietly confident. Plain over clever. Specific over vague.
- Avoid: "seamlessly", "supercharge", "unleash", "empower", "revolutionize".
- Full voice guide in `nuthatch-brand-guide.md` (root).

## Hard constraints — never violate

1. **No telemetry/analytics/phone-home** even opt-in. Breaks self-host promise.
2. **No dependencies requiring a paid third-party service** to function (e.g. external auth required, external DB required). Everything must work on a plain VPS.
3. **Never commit secrets.** `.env`, `.env.local`, `.env.production` are in `.gitignore` and must stay there.
4. **Docker Compose quick-start must keep working.** Any change that breaks `docker compose up` on a fresh clone is a regression.
5. **AGPL compatibility.** Don't add dependencies with incompatible licenses (GPL, no-commercial-use, proprietary). Check with `npx license-checker` when adding deps.
6. **Audit trail for mutations.** Every write to `services`, `credentials`, `budgets`, `memberships` writes an audit row.
7. **No secrets in logs.** Use structured logging with redaction. Never `console.log(user)` or `console.log(request.body)` without scrubbing.

## Commit conventions

Conventional Commits on `main`:
```
feat: add Stripe billing adapter
fix: handle AWS Cost Explorer 429 responses
docs: explain self-hosting on Fly.io
chore: bump dependencies
refactor: extract encryption helpers
test: cover email parser edge cases
```

PR titles become squash commit messages (repo uses squash-merge only).

## Working with Claude Code

- **Plan mode on for non-trivial work.** Don't let Claude jump to code for anything beyond a typo fix.
- **Commit after each working increment.** Checkpoint progress — `git reset` is easier than undoing big diffs.
- **Prefer small PRs.** One feature = one PR. Easier to review, easier to revert.
- **Use `/feature-dev`** (from the plugin) for anything larger than a single-file change.
- **Use `/code-review`** before opening a PR.
- **Use Context7** when uncertain about library APIs — pull current docs instead of guessing.

## When uncertain

If a requirement seems ambiguous, **ask before implementing**. Scaffolding the wrong thing wastes tokens and time. Examples:
- "Should this be a Server Action or an API route?" — ask
- "Single-currency or multi-currency in Phase 1?" — ask (answer: single, multi in Phase 2)
- "Include SSO in this PR?" — ask (answer: no, SSO is an enterprise plugin)

## Don't touch without asking

- Any file in repo root (README, LICENSE, CLA, CONTRIBUTING, SECURITY, docker-compose.yml, .env.example, .gitignore)
- `.github/` workflows and templates
- `.claude/` itself (this folder)
- Dependencies in `package.json` (add new ones but don't upgrade/remove without discussion)
