<h1 align="center">Nuthatch</h1>

<p align="center">
  <strong>Self-hosted cost tracker for teams.</strong><br>
  One dashboard for SaaS subscriptions, cloud usage, and AI API spend.
</p>

<p align="center">
  <a href="https://github.com/dmicseng/nuthatch/actions"><img src="https://img.shields.io/badge/build-pending-lightgrey" alt="Build status"></a>
  <a href="https://github.com/dmicseng/nuthatch/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue" alt="License"></a>
  <a href="https://github.com/dmicseng/nuthatch/stargazers"><img src="https://img.shields.io/github/stars/dmicseng/nuthatch?style=flat" alt="Stars"></a>
</p>

---

## What it does

Nuthatch pulls together every bill your team pays — SaaS subscriptions, cloud usage, AI API spend — into one dashboard on your own server.

- Track 50+ vendors out of the box (AWS, GCP, Azure, OpenAI, Anthropic, Stripe, Figma, Slack, and more)
- Parse email receipts automatically, or enter manually
- Connect billing APIs for real-time usage tracking
- Flag unused subscriptions, price changes, and budget overruns
- Multi-user with role-based access and audit log
- Deploy with Docker Compose on your own infrastructure

Named after the bird that stashes seeds in the cracks of bark and remembers each spot months later. Your stack deserves the same.

---

## Why self-hosted

Your bills tell a story about your business — which vendors you rely on, which teams spend what, where you're over budget. That story belongs on your server, not someone else's.

- **Your data never leaves your infra.** Envelope encryption at rest, per-tenant data keys, no phone-home telemetry.
- **Transparent licensing.** AGPL v3 for the core, commercial license available for organizations that prefer it.
- **No vendor lock-in.** Export everything any time. It's your data.

---

## Quick start

### Docker Compose (recommended)

```bash
git clone https://github.com/dmicseng/nuthatch.git
cd nuthatch
cp .env.example .env
# edit .env to set NUTHATCH_SECRET_KEY and admin credentials
docker compose up -d
```

Open `http://localhost:3000` and sign in with the admin credentials you set.

### Manual install

See [docs/install.md](docs/install.md) for bare-metal installation on Ubuntu, Debian, and RHEL-family systems.

---

## Architecture

```
browser ─┬─► app server (Node/TypeScript)
         │        │
         │        ├─► PostgreSQL (encrypted fields for credentials/tokens)
         │        ├─► Redis (queue + cache)
         │        └─► workers (email parsing, API sync, alerts)
         │
         └─► (optional) KMS for envelope encryption master key
```

Designed to run on a $5/month VPS (1 vCPU, 1 GB RAM) for small teams. Scales horizontally when you outgrow that.

---

## License

Nuthatch is **dual-licensed**:

1. **AGPL v3** — free for self-hosting, open-source projects, and internal business use. If you distribute a modified version or make it accessible over a network, you must release your changes under AGPL v3.

2. **Commercial license** — for organizations that want to integrate Nuthatch with proprietary software, avoid AGPL obligations, or need a license that works cleanly with their internal policies. Contact hello@nuthatch.io.

Enterprise features (SSO/SAML, advanced audit log, fine-grained RBAC) are separate plugins available under a commercial license only. The core product is fully functional without them.

See [LICENSE](LICENSE) for the full AGPL v3 text.

---

## Contributing

We welcome contributions — bug reports, documentation, vendor parsers, translations, and code.

Before opening a PR:

1. Read [CONTRIBUTING.md](CONTRIBUTING.md) for the development setup and style guide
2. Sign the [Contributor License Agreement](CLA.md) (automated via GitHub on your first PR)
3. Open an issue first for anything non-trivial so we can discuss direction

The easiest place to start is adding a **vendor parser** for a service Nuthatch doesn't yet support. See [docs/vendor-parsers.md](docs/vendor-parsers.md) for the template.

---

## Security

If you discover a security vulnerability, please email security@nuthatch.io instead of opening a public issue. We'll acknowledge within 48 hours and coordinate disclosure.

See [SECURITY.md](SECURITY.md) for our security policy.

---

## Links

- **Docs** — https://docs.nuthatch.io
- **Roadmap** — [projects/roadmap](https://github.com/dmicseng/nuthatch/projects)
- **Discussions** — [GitHub Discussions](https://github.com/dmicseng/nuthatch/discussions)
- **Changelog** — [CHANGELOG.md](CHANGELOG.md)

---

<p align="center">
  <sub>Built by a small team. No VC, no growth hacks, no dark patterns.</sub>
</p>
