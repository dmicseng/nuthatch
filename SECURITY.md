# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in Nuthatch, please report it privately.

**Do not open a public GitHub issue.** Public issues allow attackers to see and exploit the issue before a fix is available.

Instead:

- **Email**: security@nuthatch.io
- **Subject**: `[security] <short description>`
- Include: reproduction steps, affected versions, potential impact, and any suggested remediation

We will:

1. Acknowledge your report within **48 hours**
2. Provide an initial assessment within **7 days**
3. Work with you to understand the issue, develop a fix, and coordinate disclosure
4. Credit you in the release notes when the fix ships (unless you prefer to remain anonymous)

## Supported versions

We provide security fixes for:

- The **current major version** (all minor and patch releases)
- The **previous major version** for 6 months after a new major release

Older versions: we recommend upgrading. If you can't, a commercial support contract includes extended security coverage — contact sales@nuthatch.io.

## Scope

In scope:
- The Nuthatch application itself
- Official Docker images published by the Nuthatch team
- Official deployment templates (Docker Compose, Kubernetes Helm charts)

Out of scope:
- Third-party dependencies (report to the respective project)
- Issues requiring physical access to the server
- Denial of service through resource exhaustion on a single-tenant deployment
- Missing security headers on the public marketing website

## Disclosure timeline

Our standard disclosure timeline:

- **Day 0**: vulnerability reported
- **Day 1-2**: acknowledgment sent
- **Day 3-30**: fix developed and tested
- **Day 30-60**: fix released to supported versions
- **Day 60-90**: public disclosure (CVE issued, advisory published)

We may accelerate this timeline for critical issues or delay it for complex issues. We'll communicate with you throughout.

## Bug bounty

We don't currently run a paid bug bounty program. We do recognize researchers in release notes and on our [security hall of fame](https://nuthatch.io/security) page.

Thank you for helping keep Nuthatch users safe.
