---
description: Review staged changes and commit with Conventional Commits message
---

You are about to commit work. Follow this process:

1. Run `git status` and `git diff --cached` to see what's staged
2. If nothing is staged, run `git status` and ask whether to stage specific files
3. Analyze the changes and draft a Conventional Commits message:
   - Format: `<type>: <short description>`
   - Types: feat, fix, docs, chore, refactor, test, style, perf
   - Keep subject line under 72 characters
   - No period at end of subject
   - If changes are significant, add a body explaining the *why* (not the what)
4. Show me the proposed message and wait for approval
5. On approval, run `git commit -m "<message>"`
6. Show the commit hash and a summary

Never commit if:
- There are `.env` files in the staged changes
- There are obvious secrets (API keys, tokens, passwords) in the diff
- The changes include `console.log` of sensitive data (users, tokens, passwords)
- Tests are failing (run `npm test` first if any src/ files are touched)

If any of these block the commit, report the issue and stop.
