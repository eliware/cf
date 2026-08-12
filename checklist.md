# `cf` CLI Checklist

## Foundation

- [x] Define and document command grammar and resource naming.
- [ ] Define standard verbs, flags, exit codes, JSON schemas, and pagination behavior.
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

- [ ] Standardize human-readable tables.
- [x] Add stable `--json` output.
- [x] Add `--jq` filtering.
- [ ] Add template output if useful.
- [ ] Add `--web` dashboard links.
- [x] Handle pagination consistently.
- [x] Add quiet and verbose modes.
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
- [ ] Add Origin CA certificate management.
- [x] Add cache purge commands.
- [x] Add health-check commands.
- [ ] Add Load Balancer commands.
- [ ] Add tunnel commands.
- [x] Add audit-log commands.

## Workflows and safety

- [ ] Add zone configuration audits.
- [ ] Add security baseline checks.
- [ ] Add DNS diff and apply workflows.
- [ ] Add TLS certificate coverage checks.
- [ ] Add inventory export.
- [ ] Make workflows plan-first by default.
- [ ] Require explicit confirmation for destructive actions.
- [ ] Test success, failure, validation, dry-run, and API error paths.

## Platform resources

- [ ] Add Workers commands.
- [ ] Add Pages commands.
- [ ] Add R2 commands.
- [ ] Add D1 commands.
- [ ] Add Queues and Durable Objects commands.
- [ ] Add Stream and Images commands.
- [ ] Add AI and Vectorize commands.
- [ ] Add Access and Zero Trust commands.

## Extensions and polish

- [ ] Implement `cf extension list`.
- [ ] Implement extension install/remove/upgrade.
- [ ] Add Kubernetes/GitOps extension support.
- [ ] Add VyOS and certificate deployment extensions.
- [ ] Add Bash, Zsh, Fish, and PowerShell completion.
- [ ] Add man pages.
- [x] Add consistent migration notices for compatibility aliases.
- [x] Add end-to-end CLI tests.
- [x] Update README with a `gh`-to-`cf` orientation guide.

## Release gates

- [x] `npm test`
- [x] `npm run lint`
- [x] `npm run test:gaps`
- [x] `npm run pack`
- [x] Verify `cf --help` and representative JSON/JQ commands.
