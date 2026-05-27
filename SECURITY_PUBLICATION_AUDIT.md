# Public Repository Secret Audit

Date: 2026-05-27
Repository: `kyasui-dotcom/aiagent2`
GitHub visibility observed locally: `PUBLIC`

## Summary

No real OpenAI API key, GitHub token, Cloudflare token, Google API key, AWS key, Stripe live key, webhook secret, or private key was found in the current tracked files using the publication scan below.

The repository is already public. Treat all current tracked files and reachable Git history as public.

## Checks Run

- `gh repo view kyasui-dotcom/aiagent2 --json nameWithOwner,visibility,isPrivate,url`
- `npm run qa:open-core`
- `git grep -nI` for OpenAI, Anthropic, GitHub, Google, Slack, AWS, Stripe live, webhook secret, and private-key patterns
- `rg` scan of the working tree excluding `.git`, `node_modules`, `tmp`, `test-results`, `playwright-report`, and `output`
- `git rev-list --all` plus `git grep` for high-risk secret patterns in history
- `git check-ignore -v .env .env.e2e.local .dev.vars`

## Findings

### No Current Real Secret Hits

Current tracked files did not match high-risk real secret patterns for:

- OpenAI project/API keys
- Anthropic keys
- GitHub personal access tokens
- Google API keys
- AWS access keys
- Slack tokens
- Stripe live keys
- webhook secrets
- PEM private keys

Environment variable names appear throughout the code and docs, but the tracked values are empty placeholders, examples, or test-only strings.

### Local Ignored Env File Exists

`.env.e2e.local` exists locally and is ignored by `.gitignore` via `*.local`. It contains local E2E auth settings and is not tracked.

### History Contains a Fake OpenAI-Looking Test String

Git history contains a QA prompt with a fake-looking `sk-proj-...` string in old `scripts/settings-qa.mjs` commits. It appears to be test data, not a real credential. Because the repository is public, future tests should avoid strings that look like real provider tokens.

### Public Metadata Is Visible

`wrangler.jsonc` contains non-secret public deployment metadata such as public URLs, a D1 database id, queue names, and admin/contact email addresses. These are not API keys, but they are visible to readers of the public repository.

## Recommended Policy

- Keep `.env`, `.env.*.local`, `.dev.vars`, `.wrangler/`, `.data/`, `tmp/`, `output/`, and test artifacts ignored.
- Do not use provider-realistic fake keys in tests; prefer strings like `openai-test-key-placeholder`.
- Rotate any real provider key immediately if it is ever committed, even briefly.
- Keep production secrets in Cloudflare secrets or GitHub Actions secrets, never in tracked files.
