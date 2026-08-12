# [![eliware.org](https://eliware.org/logos/brand.png)](https://discord.gg/M6aTR9eTwN)

## @eliware/cf [![npm version](https://img.shields.io/npm/v/@eliware/cf.svg)](https://www.npmjs.com/package/@eliware/cf) [![license](https://img.shields.io/github/license/eliware/cf.svg)](LICENSE) [![build status](https://github.com/eliware/cf/actions/workflows/nodejs.yml/badge.svg)](https://github.com/eliware/cf/actions)

An OAuth-first Cloudflare administration CLI for inspecting and managing zones, DNS, rules, settings, lists, and account services. `cf` is designed to feel familiar to anyone who uses the GitHub CLI: commands are composable, automation-friendly, and safe by default.

## Features

- OAuth browser login with a guided scope picker and OS keychain storage.
- API-token login for headless automation with `--token-stdin`.
- Multiple named profiles with switch, status, verify, list, and logout commands.
- Zone, DNS record, zone setting, ruleset, Cloudflare list, and list-item commands.
- Account resource commands for load balancers, tunnels, Workers, Pages, R2, D1, Queues, Stream, Images, AI, and Access.
- Read-only health, audit, inventory, SSL, Origin CA, and cache commands.
- `cf api` for direct access to any Cloudflare API endpoint.
- Human-readable and JSON output, including `--jq` and templates.
- `--dry-run` for supported writes and `--force` for destructive operations.
- GitHub CLI-style help, aliases, typo suggestions, and command discovery.
- Dependency-injected ESM architecture with an extension/plugin contract and example extension.

## Requirements

- Node.js 26 or newer.
- A Cloudflare account and permission to authorize the Eliware OAuth client, or an API token for automation.
- Account and zone IDs for commands that need an explicit scope when defaults are not configured.

## Installation

Install the published package:

```sh
npm install --global @eliware/cf
```

Or install from source:

```sh
git clone https://github.com/eliware/cf.git
cd cf
npm install
npm link
```

Verify the installation:

```sh
cf --version
cf --help
```

## Authentication

Interactive users should start the OAuth flow:

```sh
cf auth login
```

The local web interface lets users select the scopes they need before authorizing with Cloudflare. Access and refresh credentials are stored in the operating system keychain when available. The callback page confirms success or failure and then the temporary local server shuts down.

For headless automation, provide an API token through standard input:

```sh
printf '%s' "$CLOUDFLARE_API_TOKEN" | cf auth login --profile ci --token-stdin
```

Use profiles to separate accounts or automation contexts:

```sh
cf auth list
cf auth status
cf auth switch --profile work
cf auth verify
cf auth logout --profile work
```

An unauthenticated command reports that the user is not logged in and directs them to `cf auth login`, matching the familiar GitHub CLI workflow.

## Configuration

Environment variables may be supplied directly, through a local `.env`, or as optional defaults in the project configuration:

```env
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_ZONE_ID=your_zone_id
```

OAuth profiles are stored in the `~/.cf` configuration directory, while secrets are stored in the OS keychain. Existing environment variables take precedence over profile values. Keep tokens, `.env` files, keychain exports, and generated state private; none should be committed.

## Usage

Inspect zones and DNS records:

```sh
cf zones list
cf zones get --zone-id <zone_id>
cf dns-records list --zone-id <zone_id>
cf dns-records get --zone-id <zone_id> --id <record_id> --output json
```

Create or preview a DNS change:

```sh
cf dns-records create --zone-id <zone_id> \
  --data '{"type":"A","name":"www","content":"192.0.2.1"}' \
  --dry-run
```

Destructive operations require explicit confirmation:

```sh
cf dns-records delete --zone-id <zone_id> --id <record_id> --force
```

Use JSON, jq selection, templates, or dashboard links in automation:

```sh
cf zones list --json
cf zones list --json --jq '.result[]'
cf api /zones --json --jq '.result[].name'
cf api /zones --json --template '{{.result}}'
cf zones get --zone-id <zone_id> --web
```

Access the full Cloudflare API when a built-in command is not available:

```sh
cf api /zones
cf api zones/<zone_id>/dns_records --method POST \
  --data '{"type":"TXT","name":"example.com","content":"hello"}'
```

Run `<resource> --help` or `<resource> <command> --help` for detailed command-specific help. Singular aliases such as `cf zone`, `cf dns`, `cf rules`, and `cf list` are supported.

## Extensions

Extensions add local commands without changing the built-in CLI. The repository includes an example extension and documents the extension manifest and handler contract:

```sh
cf extension list
cf extension install --path examples/extensions/hello
cf hello --name Eli
```

See [docs/extensions.md](docs/extensions.md) for the extension contract and [docs/gh-orientation.md](docs/gh-orientation.md) for the GitHub CLI familiarity guide.

## Development

Install dependencies and run the validation suite:

```sh
npm install
npm test
npm run lint
npm run test:gaps
npm run pack
```

The test suite uses dependency injection for Cloudflare clients, filesystem access, environment loading, output, handlers, and process exits. Browser checks for the OAuth web interface are available without authenticating:

```sh
npm run test:e2e:screenshots
npm run test:e2e:lighthouse
npm run test:e2e:web
```

Screenshots and Lighthouse reports are written under the ignored `artifacts/` directory. Puppeteer is a development dependency and the local web test page can simulate the OAuth picker and callback result states.

## Project structure

- `bin/` - executable CLI entry point.
- `src/cli.mjs` - dependency-injected command runtime.
- `src/handlers/` - built-in resource and authentication handlers.
- `src/oauth-web/` - standalone OAuth picker and callback pages.
- `src/` - argument, environment, API, profile, output, and extension utilities.
- `examples/extensions/` - example extension.
- `tests/` - unit and integration tests.
- `tests/e2e/` - Puppeteer and Lighthouse checks.
- `dream.md` - product vision.
- `dream_sprints.md` - roadmap.

## Support

For help, questions, or community chat:

[![Discord](https://eliware.org/logos/discord_96.png)](https://discord.gg/M6aTR9eTwN)  
**[eliware.org on Discord](https://discord.gg/M6aTR9eTwN)**

## License

[ISC © 2026 Eli Sterling, eliware.org](LICENSE)

## Links

- [Project Home](https://eliware.org/cf)
- [Privacy Policy](https://eliware.org/cf/policy)
- [Terms of Service](https://eliware.org/cf/tos)
- [GitHub Repository](https://github.com/eliware/cf)
- [GitHub Organization](https://github.com/eliware)
- [npm Package](https://www.npmjs.com/package/@eliware/cf)
- [Discord](https://discord.gg/M6aTR9eTwN)
