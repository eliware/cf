# Plan: Make `cf` as Familiar as `gh`

## Goal

Someone familiar with the GitHub CLI should be able to use `cf` productively without learning a separate interaction model.

Success should look like:

```bash
cf auth login
cf zone list
cf zone view example.com
cf dns list example.com
cf rules list example.com
cf api zones
cf zone list --json
cf zone list --jq '.[].name'
```

## Phases

### 1. Freeze the CLI contract

Define command naming, resource verbs, flags, exit codes, JSON schemas, pagination, interactive behavior, confirmation, and context resolution.

Initial resource groups:

```text
auth account zone dns setting ssl cert rules list cache
load-balancer health-check worker pages r2 tunnel api extension
```

### 2. Build `gh`-style authentication

Implement `cf auth login`, `status`, `list`, `switch`, `logout`, and token verification. Support multiple profiles/accounts, defaults, environment overrides, secure storage, and CI authentication.

### 3. Standardize output and context

Provide shared `--json`, `--jq`, `--template`, `--web`, `--paginate`, `--limit`, `--quiet`, and `--verbose` behavior. Add account/zone defaults through `cf config`.

### 4. Add the universal API escape hatch

Implement `cf api <path>` with method selection, JSON input, query parameters, pagination, dry-run support, safe mutation handling, consistent errors, and credential redaction.

### 5. Migrate current functionality

Use explicit resource names consistently across the CLI:

```text
zones
dns-records
zone-settings
rulesets
lists
```

### 6. Complete core Cloudflare operations

Add zones, DNS, TLS/Origin CA, rulesets, lists, cache, health checks, load balancers, tunnels, audit logs, and security audits.

### 7. Add opinionated workflows

Add safe plan-first workflows such as `cf zone audit`, `cf zone standardize`, `cf dns diff`, `cf dns apply`, `cf tls inspect`, `cf security baseline`, and `cf inventory export`.

### 8. Add platform resources

Expand into Workers, Pages, R2, D1, Queues, Durable Objects, Stream, Images, AI, Access, and Zero Trust.

### 9. Add extensions

Implement `cf extension list|install|remove|upgrade` and support specialized extensions such as Kubernetes, GitOps, VyOS, and certificate deployment.

### 10. Polish for `gh` users

Add shell completion, man pages, consistent help/examples, dashboard links, interactive selectors, migration notices, and full end-to-end CLI coverage.

## Validation

Every phase should pass:

```bash
npm test
npm run lint
npm run test:gaps
npm run pack
```

The CLI should also support predictable checks such as:

```bash
cf --help
cf auth --help
cf zone --help
cf api --help
cf zone list --json
cf zone list --jq '.[].name'
```

Mutating commands must test success, validation failures, dry-run behavior, confirmation, API errors, pagination, JSON output, and credential redaction.

## Milestones

Commit after each phase. Push after phases 1–4, 5–7, 8, and 9–10. The first high-value milestone is phase 7: a familiar operator CLI covering our needs while exposing the complete API through `cf api`.
