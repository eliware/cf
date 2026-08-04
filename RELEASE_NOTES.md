# Release Notes

## 1.0.6

### Highlights

- Refactored the CLI runtime for dependency injection and easier testing.
- Added a standalone `cf-admin` executable.
- Preserved the legacy `cf_admin` executable name as a compatibility symlink.
- Added comprehensive Cloudflare administration handlers.

### Supported Resources

- Zones
  - List, inspect, create, update, and delete
- DNS records
  - List, inspect, create, update, and delete
- Zone settings
  - Read and update settings
- Rulesets
  - List, inspect, create, and update
- Cloudflare lists
  - List and inspect lists
- List items
  - List, create, and delete items

### CLI Features

- Human-readable text output.
- JSON output with `--json` or `--output json`.
- `--dry-run` support for supported write operations.
- `--force` protection for destructive operations.
- Inline JSON bodies with `--data`.
- JSON bodies loaded from files with `--file`.
- Account and zone scoping through command options or environment variables.
- Resource-specific help output.
- Injectable output and process-exit handling for automation and tests.

### Reliability and Security

- Dependency-injected Cloudflare client factory.
- Injectable filesystem and environment loaders.
- Improved Cloudflare zone-settings API compatibility.
- Credentials remain environment-based and are never stored in source.
- Coverage, generated files, `.env` files, and local state ignored by Git.

### Quality

- 53 Jest tests.
- 100% source coverage across statements, branches, functions, and lines.
- Oxlint validation with zero warnings and errors.
- Added project development guidance in `AGENTS.md`.
- Added complete usage documentation in `README.md`.
- Added long-term product vision and staged roadmap documents.

### Upgrade Notes

- The package name is `@eliware/cf-admin`.
- The primary command is now `cf-admin`.
- Existing `cf_admin` command compatibility is retained through a symlink.
- This release does not include the future GitOps, audit, dashboard, replay, or plugin features described in `dream_sprints.md`.
