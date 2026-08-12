# [![eliware.org](https://eliware.org/logos/brand.png)](https://discord.gg/M6aTR9eTwN)

## @eliware/cf [![npm version](https://img.shields.io/npm/v/@eliware/cf.svg)](https://www.npmjs.com/package/@eliware/cf) [![license](https://img.shields.io/github/license/eliware/cf.svg)](LICENSE) [![build status](https://github.com/eliware/cf/actions/workflows/nodejs.yml/badge.svg)](https://github.com/eliware/cf/actions)

A dependency-injected Cloudflare administration CLI for scripting and inspecting zones, DNS, rulesets, settings, lists, and list items.

## Features

- Zone list, inspect, create, update, and delete
- DNS record list, inspect, create, update, and delete
- Zone setting read/update support
- Ruleset list, inspect, create, and update
- Cloudflare list and list-item management
- JSON or human-readable output
- Dry-run support for writes
- Force confirmation for destructive operations
- Testable dependency-injected architecture
- Singular aliases for familiar resources (`cf zone`, `cf dns`, `cf rules`)
- Universal `cf api` escape hatch for any Cloudflare API endpoint
- Read-only authentication status and context inspection
- SSL/TLS setting inspection and controlled cache purges
- Zone health-check and account audit-log inspection

## Requirements

- Node.js 26+ required
- Cloudflare API credentials
- Cloudflare account ID for account-scoped resources when not supplied on the command
- Cloudflare zone ID for zone-scoped resources supplied on the command

## Installation

```sh
git clone git@github.com:eliware/cf.git
cd cf
npm install
npm test
npm run lint
npm run test:gaps
npm run pack
npm install -g .
```

The global install provides:

```sh
cf --help
cf --version
```

## Configuration

Set credentials in the environment, a `.env` file in the current directory, or `~/.cf`:

```env
CLOUDFLARE_EMAIL=you@example.com       # required secret; API email
CLOUDFLARE_API_KEY=your_api_key        # required secret; API key
CLOUDFLARE_API_TOKEN=your_api_token    # alternative secret; API token
CLOUDFLARE_ACCOUNT_ID=your_account_id  # optional default for account resources
CLOUDFLARE_ZONE_ID=your_zone_id        # optional default for zone resources
```

Use either `CLOUDFLARE_API_TOKEN` or the legacy email/API-key pair before API access. Account and zone IDs are optional defaults; command-line IDs take precedence where supported. The CLI loads `~/.cf` first, then `.env` from the current directory; existing environment variables take precedence. Both files use dotenv syntax. Keep credentials private and never commit `.env`, `.cf`, credentials, tokens, or generated state.

## Usage

```sh
cf zones list
cf zone list
cf zones get --zone-id <zone_id>
cf zone audit --zone-id <zone_id> --json
cf dns-records list --zone-id <zone_id>
cf dns-records create --zone-id <zone_id> \
  --data '{"type":"A","name":"www","content":"1.2.3.4"}'
cf rulesets list --zone-id <zone_id> --json
cf zone-settings get --zone-id <zone_id> --setting development_mode
cf api /zones --json
cf api zones/<zone_id>/dns_records --json
cf auth status
cf auth verify
cf auth list
cf auth login --profile work
cf auth switch --profile work
cf auth logout --profile work
cf ssl get --zone-id <zone_id>
cf cache purge --zone-id <zone_id> --data '{"purge_everything":true}' --force
cf health list --zone-id <zone_id>
cf audit list --account-id <account_id>
```

Use JSON output for automation:

```sh
cf zones list --json
cf dns-records get --zone-id <zone_id> --id <record_id> --output json
cf zones list --json --jq '.result[]'
cf api /zones --json --jq '.result[].name'
```

Preview supported writes:

```sh
cf dns-records create --zone-id <zone_id> \
  --data '{"type":"A","name":"test","content":"192.0.2.1"}' \
  --dry-run
```

Destructive operations require `--force`:

```sh
cf dns-records delete --zone-id <zone_id> --id <record_id> --force
```

## Resources

- `zones`
- `zone-settings`
- `dns-records`
- `rulesets`
- `lists`
- `list-items`

Run `<resource> --help` for action-specific help.

For users coming from the GitHub CLI, see [From `gh` to `cf`](docs/gh-orientation.md).

## Security

`CLOUDFLARE_EMAIL` and `CLOUDFLARE_API_KEY` are required secrets. Credentials may be stored in `~/.cf` or the current directory's `.env` file. The account ID is an optional default; zone and account scope can also be supplied on commands. Never log or commit credentials.

## Development

```sh
npm test
npm run lint
npm run test:gaps
npm run pack
```

The test suite uses injected Cloudflare clients, filesystem adapters, environment loaders, printers, handlers, and process exits. Current source coverage is 100%.

## Project Structure

- `bin/` - CLI entry point
- `src/cli.mjs` - dependency-injected command runtime
- `src/handlers/` - resource handlers
- `src/` - argument, environment, API, help, and output utilities
- `tests/` - Jest test suite
- `dream.md` - long-term product vision
- `dream_sprints.md` - staged roadmap

## Support

For help or questions, join the community:

[![Discord](https://eliware.org/logos/discord_96.png)](https://discord.gg/M6aTR9eTwN)  
**[eliware.org on Discord](https://discord.gg/M6aTR9eTwN)**

## License

[ISC © 2026 Eli Sterling, eliware.org](LICENSE)

## Links

- [Home Page](https://eliware.org)
- [GitHub Repo](https://github.com/eliware/cf)
- [GitHub Org](https://github.com/eliware)
- [GitHub Personal](https://github.com/eli-sterling)
- [Discord](https://discord.gg/M6aTR9eTwN)
