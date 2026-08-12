# `cf` CLI Checklist

## Foundation

- [x] Define and document command grammar and resource naming.
- [x] Define standard verbs, flags, exit codes, JSON schemas, and pagination behavior.
- [x] Add shared help conventions and examples.

## Authentication and context

- [x] Implement `cf auth login`.
- [x] Implement `cf auth status`.
- [x] Implement `cf auth list`.
- [x] Implement `cf auth switch`.
- [x] Implement `cf auth logout`.
- [x] Implement token verification and permission inspection.
- [x] Support multiple profiles and Cloudflare accounts.
- [x] Support account and zone defaults.
- [x] Preserve environment-variable and CI authentication.
- [x] Store credentials securely without logging or exposing tokens.

## Output and API access

- [x] Standardize human-readable tables.
- [x] Add stable `--json` output.
- [x] Add `--jq` filtering.
- [x] Add template output if useful.
- [x] Add `--web` dashboard links.
- [x] Handle pagination consistently.
- [x] Add quiet and verbose modes.
- [x] Add pager, color, and terminal-width controls.
- [x] Implement `cf api` with GET/POST/PUT/PATCH/DELETE support.
- [x] Support JSON files and inline request bodies.
- [x] Add dry-run and mutation confirmation to API calls.
- [x] Add rate-limit backoff and credential redaction.

## Core resources

- [x] Migrate zones to `cf zone`.
- [x] Migrate DNS to `cf dns`.
- [x] Migrate zone settings to `cf setting`.
- [x] Migrate rulesets to `cf rules`.
- [x] Migrate lists to `cf list`.
- [x] Add SSL/TLS inspection and configuration.
- [x] Add Origin CA certificate management.
- [x] Add cache purge commands.
- [x] Add health-check commands.
- [x] Add Load Balancer commands.
- [x] Add tunnel commands.
- [x] Add audit-log commands.

## Workflows and safety

- [x] Add zone configuration audits.
- [x] Add security baseline checks.
- [x] Add DNS diff and apply workflows.
- [x] Add TLS certificate coverage checks.
- [x] Add inventory export.
- [x] Make workflows plan-first by default.
- [x] Require explicit confirmation for destructive actions.
- [x] Test success, failure, validation, dry-run, and API error paths.

## Platform resources

- [x] Add Workers commands.
- [x] Add Pages commands.
- [x] Add R2 commands.
- [x] Add D1 commands.
- [x] Add Queues and Durable Objects commands.
- [x] Add Stream and Images commands.
- [x] Add AI and Vectorize commands.
- [x] Add Access and Zero Trust commands.

## Extensions and polish

- [x] Implement `cf extension list`.
- [x] Implement extension install/remove/upgrade.
- [ ] Add Kubernetes/GitOps extension package(s) when those integrations are requested.
- [ ] Add VyOS and certificate deployment extension package(s) when those integrations are requested.
- [x] Add Bash, Zsh, and Fish completion.
- [x] Add man pages.
- [x] Use explicit resource names consistently in help and documentation.
- [x] Add end-to-end CLI tests.
- [x] Update README with a `gh`-to-`cf` orientation guide.

## Release gates

- [x] `npm test`
- [x] `npm run lint`
- [ ] `npm run test:gaps` (currently reports the remaining coverage gaps)
- [ ] `npm run pack` (intentionally excluded from this work)
- [x] Verify `cf --help` and representative JSON/JQ commands.
