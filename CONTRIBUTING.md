# Contributing to Nuthatch

Thanks for your interest in contributing. This document covers the development setup, PR process, and code style.

## Code of Conduct

Be kind. We follow the [Contributor Covenant](https://www.contributor-covenant.org/). Harassment, personal attacks, and bad-faith arguments will result in a ban.

## Ways to contribute

- **Bug reports** — open an issue with reproduction steps
- **Feature requests** — open a discussion first to gauge interest before a PR
- **Vendor parsers** — add support for a new service (easiest place to start)
- **Documentation** — typos, clarifications, translations
- **Code** — see below

## Development setup

Prerequisites: Node.js 20+, Docker, Docker Compose.

```bash
git clone https://github.com/dmicseng/nuthatch.git
cd nuthatch
npm install
cp .env.example .env.local
docker compose -f docker-compose.dev.yml up -d  # postgres + redis
npm run db:migrate
npm run dev
```

The app runs at `http://localhost:3000`. Hot reload is enabled for the app and workers.

### Running tests

```bash
npm test              # unit tests (fast)
npm run test:integration  # integration tests (requires docker)
npm run test:e2e      # end-to-end tests (slow, use sparingly)
```

All PRs must pass `npm test` and `npm run lint` before review.

## Pull request process

1. **Open an issue first** for anything non-trivial. This saves you time if we don't want to go that direction.
2. **Fork and branch**. Branch names: `fix/short-description` or `feat/short-description`.
3. **Write tests** for new behavior. Bug fixes should include a regression test.
4. **Update docs** if you change user-facing behavior.
5. **Sign the CLA** — the CLA-Assistant bot will prompt you on your first PR. See [CLA.md](CLA.md) for the full text.
6. **Open the PR** with a description that explains the what, why, and how.
7. **Respond to review**. We aim to respond within 3 business days.

PRs that fix typos or update docs get merged fast. PRs that change architecture or add dependencies take longer — we're deliberate about both.

## Code style

- **TypeScript strict mode** — no `any`, no `@ts-ignore` without a comment explaining why
- **Prettier** for formatting — run `npm run format` before committing
- **ESLint** for linting — run `npm run lint`
- **Naming**: files in `kebab-case.ts`, exports in `camelCase`, types in `PascalCase`, constants in `SCREAMING_SNAKE_CASE`
- **Comments**: explain *why*, not *what*. Code should be self-documenting for the *what*.

## Commit conventions

We use [Conventional Commits](https://www.conventionalcommits.org/) for the main branch:

```
feat: add Stripe billing adapter
fix: handle AWS Cost Explorer 429 responses
docs: explain self-hosting on Fly.io
chore: bump dependencies
refactor: extract encryption helpers
test: cover email parser edge cases
```

Don't worry about this for branch commits — we squash-merge and use the PR title as the final commit message.

## Adding a vendor parser

This is the easiest way to contribute. See [docs/vendor-parsers.md](docs/vendor-parsers.md) for the step-by-step guide. In short:

1. Create `plugins/parsers/<vendor>/` folder
2. Implement the `Parser` interface (one function: `parse(email) → BillingEvent`)
3. Add fixture emails to `plugins/parsers/<vendor>/__fixtures__/`
4. Write tests
5. Open PR

Most parsers take 1-2 hours to write. We appreciate any you add.

## What we won't merge

- Telemetry, analytics, or phone-home features (even opt-in — it breaks the self-host promise)
- Features that require a paid third-party service to function
- Changes that break the Docker Compose quick-start path
- Features that exist only to differentiate a paid tier at the expense of the OSS core

## Questions?

Open a GitHub Discussion or email hello@nuthatch.io. We read everything.
