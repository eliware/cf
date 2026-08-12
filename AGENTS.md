# Agent Instructions

## Purpose

`@eliware/cf` is a standalone ESM Node.js CLI for Cloudflare administration.

Current resources:

- zones
- zone settings
- DNS records
- rulesets
- Cloudflare lists
- list items

## Development Rules

- Read `README.md` before changing behavior.
- Keep handlers small and single-purpose.
- Preserve ESM and `.mjs` style.
- Prefer dependency injection for clients, filesystem access, environment loading, output, and process exits.
- Do not commit credentials, tokens, `.env` files, coverage output, or generated state.
- Keep changes scoped.
- Add or update tests for behavior changes.
- Do not publish, tag, commit, or push unless explicitly requested.

## Validation

Run from the repository root:

```sh
npm test
npm run lint
npm run test:gaps
npm run pack
```

Tests should preserve 100% source coverage where practical.

## CLI Safety

- Require `--force` for destructive operations.
- Support `--dry-run` for writes where available.
- Preserve JSON output compatibility for automation.
- Avoid leaking credentials in errors, logs, diffs, or test fixtures.

## Documentation

Update `README.md` when user-facing commands or configuration change.
Keep `dream.md` as the product vision and `dream_sprints.md` as the roadmap.
