# cf Dream Sprints

Roadmap for evolving cf from a CRUD wrapper into a reliable Cloudflare operations and GitOps platform.

## Sprint 0: Foundation

- [x] ESM project structure
- [x] Dependency-injected CLI runtime
- [x] Consistent handler interface
- [x] JSON/text output modes
- [x] Destructive-operation safeguards
- [x] Unit-testable Cloudflare client factory
- [x] High test coverage for current source
- [ ] Standard error types and exit codes
- [ ] Pagination abstraction
- [ ] Retry/backoff and rate-limit handling
- [ ] Request timeout configuration
- [ ] Structured logging and `--debug`

## Sprint 1: Profiles and Configuration

- [ ] `cf profile list`
- [ ] `cf profile use <name>`
- [ ] Separate account/zone credentials and scopes
- [ ] Safe config storage outside the repository
- [ ] Environment-variable precedence documentation
- [ ] `--config`, `--profile`, and `--quiet` options

## Sprint 2: Resource Model

- [ ] Consistent aliases: `ls`, `get`, `create`, `update`, `delete`
- [ ] Resource metadata and capability discovery
- [ ] Generic resource serialization
- [ ] Import/export format
- [ ] Dry-run output suitable for CI
- [ ] Shell completion
- [ ] Full command reference generation

## Sprint 3: Backup and GitOps

- [ ] `export zone <name>`
- [ ] Export DNS, rulesets, settings, routes, Workers, and bindings
- [ ] Secret references without exporting secret values
- [ ] Stable, normalized YAML/JSON output
- [ ] `cf diff <directory>`
- [ ] `cf plan <directory>`
- [ ] `cf apply <directory>`
- [ ] Dependency ordering
- [ ] Idempotent reconciliation
- [ ] Safe deletion detection and confirmation
- [ ] CI workflow for plan/apply
- [ ] Drift detection

## Sprint 4: DNS Power Tools

- [ ] Duplicate-record audit
- [ ] Dangling target detection
- [ ] Wildcard conflict detection
- [ ] SPF validation
- [ ] DMARC validation
- [ ] DKIM discovery
- [ ] DNSSEC status
- [ ] Internal/external split-horizon checks
- [ ] `dns graph`
- [ ] CSV import/export with validation

## Sprint 5: Security and Doctor

- [ ] `cf audit`
- [ ] `cf doctor`
- [ ] TLS and SSL settings checks
- [ ] WAF/ruleset checks
- [ ] Rate-limit checks
- [ ] DNSSEC and certificate checks
- [ ] API-token scope review
- [ ] Secret exposure checks
- [ ] Origin reachability checks
- [ ] API-limit and service-health checks
- [ ] Machine-readable findings and severity levels
- [ ] Scorecard output

## Sprint 6: Ruleset Builder

- [ ] Interactive rule editor
- [ ] Expression validation
- [ ] Human-readable expression explanation
- [ ] JSON export
- [ ] Diff before apply
- [ ] Rule ordering visualization
- [ ] Rule testing with sample requests

## Sprint 7: Multi-account and Search

- [ ] Account/profile switching
- [ ] Cross-account inventory
- [ ] `cf find <query>`
- [ ] Search DNS, Workers, Pages, rules, routes, KV, R2, D1, and queues
- [ ] Resource tags and local indexes
- [ ] Dependency graph generation

## Sprint 8: Observability

- [ ] `cf top`
- [ ] Request/error/cache metrics where API access permits
- [ ] Streaming dashboard refresh
- [ ] Traffic by country, ASN, colo, status, and hostname
- [ ] Alert/notification integrations
- [ ] Export metrics for Prometheus-compatible systems

## Sprint 9: Advanced Debugging

- [ ] Request capture where supported
- [ ] Request metadata inspection
- [ ] Safe request replay against staging/origin
- [ ] Worker log integration
- [ ] Execution timeline where Cloudflare exposes data
- [ ] Clearly document unsupported tracing/debugger capabilities

## Sprint 10: Bulk Operations

- [ ] Bulk DNS operations
- [ ] Bulk ruleset changes
- [ ] Bulk Worker deployment
- [ ] Bulk cache purge
- [ ] Bulk secret rotation
- [ ] Transaction previews
- [ ] Partial-failure reporting
- [ ] Resume/retry support

## Sprint 11: Plugin Architecture

- [ ] Plugin discovery and lifecycle
- [ ] Versioned plugin API
- [ ] Local plugin loading
- [ ] GitHub integration
- [ ] Terraform/state integration
- [ ] Slack/Discord/PagerDuty integrations
- [ ] Permission and trust model

## Sprint 12: Terminal UI

- [ ] Interactive shell mode
- [ ] Resource-aware autocomplete
- [ ] Interactive dashboards
- [ ] Ruleset editor UI
- [ ] Diff viewer
- [ ] Progress and confirmation components
- [ ] Keep every TUI feature available in non-interactive JSON mode

## Deferred / Feasibility Risks

- Full Worker debugger with breakpoints may require unavailable Cloudflare runtime APIs.
- End-to-end WAF-to-origin tracing may not be exposed publicly.
- Cost data may require separate billing APIs or plan access.
- Analytics depth varies by Cloudflare plan.
- Apply/rollback must be treated as a state-reconciliation system, not simple CRUD.
- Secrets must never be written to exports, logs, diffs, or Git.

## Recommended First Milestone

Deliver a production-quality GitOps core:

1. Profiles
2. Normalized export/import
3. Diff and plan
4. Safe apply
5. DNS audit
6. Security audit/doctor
7. CI validation
8. Documentation and examples

Only then invest in TUI, streaming dashboards, replay, and AI features.
