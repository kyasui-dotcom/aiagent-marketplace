# Open Source Release Posture

This repository is public and licensed under the GNU Affero General Public License v3 or later. The intent is to make CAIt's agent orchestration work inspectable and reusable while keeping real credentials, customer data, and operator-only records out of Git.

## Public Repository Boundary

The repository may include:

- agent manifests, verification logic, orchestration logic, and adapter generation
- public UI, public docs, and generated public SEO pages
- non-production QA scripts and fixtures
- deployment configuration that contains only non-secret resource identifiers or public URLs

The repository must not include:

- real environment values, API keys, session secrets, OAuth client secrets, webhook secrets, or private keys
- Cloudflare API tokens, GitHub App private keys, Google OAuth secrets, OpenAI keys, or provider credentials
- `.env`, `.dev.vars`, `.wrangler/`, `.data/`, D1 dumps, local run history, browser artifacts, screenshots, or test output
- customer/support exports, private account records, or operator-only review queues

## Required Checks Before Pushing Public Changes

Run these checks before pushing changes that affect deployment, auth, connectors, agent execution, or public docs:

```bash
npm run qa:open-core
git grep -nI -E "(sk-proj-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{32,}|gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|AIza[0-9A-Za-z_-]{35}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA|OPENSSH|EC|DSA|PRIVATE) PRIVATE KEY-----)" -- .
```

Also check ignored local env files manually when they exist:

```bash
git check-ignore -v .env .env.e2e.local .dev.vars
```

## Current Publication Audit

The latest local audit is recorded in [`SECURITY_PUBLICATION_AUDIT.md`](./SECURITY_PUBLICATION_AUDIT.md). Update that file whenever the repository visibility, credential handling, or publish boundary changes.

## Notes

`package.json` keeps `"private": true` to prevent accidental npm publication. That does not make the GitHub repository private and does not conflict with the AGPL source license.
