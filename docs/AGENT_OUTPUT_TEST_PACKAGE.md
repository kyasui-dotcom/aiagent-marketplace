# Agent Output Test Package

This package captures before/after outputs for built-in agent files using the same input cases. It is intentionally a test harness only. It must not become an action registry, a shared delivery contract, or a worker/client routing table.

Fixture cases may name an agent file, kind, prompt, and input body only. They must not define agent purpose, action boundaries, authority boundaries, forbidden claims, or delivery contract sections; those stay in the relevant agent JS file and are only observed by this harness.

## Files

- `scripts/agent-output-regression.mjs` - snapshot and comparison runner.
- `scripts/fixtures/agent-output-cases.json` - reusable input cases. The initial group is `marketing`.
- Output snapshots are written under `tmp/` by default and are ignored by Git.

## Default Stable Mode

The default mode uses a mock OpenAI `fetch` implementation. The mock reads the exact provider request packet sent by each agent and generates deterministic Markdown from that packet. This makes it useful for checking whether an agent definition started passing stronger purpose/action/delivery data into its provider run.

```bash
npm run agent:test:snapshot -- --group marketing --out tmp/agent-before
npm run agent:test:compare -- --group marketing --baseline tmp/agent-before/snapshot.json --out tmp/agent-after
```

Read:

- `tmp/agent-before/snapshot.json`
- `tmp/agent-after/snapshot.json`
- `tmp/agent-after/comparison.md`

## Live OpenAI Mode

Use live mode when you want to see real model behavior changes. This is less deterministic and should be reviewed manually.

```bash
npm run agent:test:snapshot -- --group marketing --out tmp/live-before --live
npm run agent:test:compare -- --group marketing --baseline tmp/live-before/snapshot.json --out tmp/live-after --live
```

Live mode expects the agent provider to receive usable OpenAI credentials from the normal environment/source path.

## Narrow Runs

Run one agent or one case:

```bash
npm run agent:test:snapshot -- --agent x-post.js --out tmp/x-before
npm run agent:test:snapshot -- --case seo-specialist-rewrite --out tmp/seo-before
```

## How To Use During Agent Improvements

1. Capture `before`.
2. Improve one or more agent files.
3. Run `compare` against the saved baseline.
4. Inspect `comparison.md` for changed sections and missing/added delivery signals.
5. Keep the agent-owned improvements inside the relevant agent file.
