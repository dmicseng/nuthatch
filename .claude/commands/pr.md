---
description: Push current branch and open a PR with structured body
---

Open a pull request for the current branch. Follow this process:

1. Check current branch name with `git branch --show-current`. If on `main`, stop — I need to create a feature branch first.
2. Push the branch: `git push -u origin <branch-name>`
3. Analyze commits on this branch vs main to draft a PR body:
   - Summary (1–3 sentences on what changed)
   - Why (motivation, link to related issue if any)
   - Changes (bullet list of major changes)
   - Testing (how to verify: commands to run, pages to visit)
   - Screenshots (if UI changed — prompt me to attach)
   - Checklist:
     - [ ] Tests pass (`npm test`)
     - [ ] Types check (`npm run typecheck`)
     - [ ] Lint passes (`npm run lint`)
     - [ ] No secrets committed
     - [ ] Docker Compose still works (`docker compose up` on fresh clone)
4. Show me the proposed PR title and body, wait for approval.
5. On approval, run `gh pr create --title "<title>" --body "<body>"`.
6. Show the PR URL.

PR titles follow Conventional Commits — repo uses squash-merge so PR title becomes the commit message.
