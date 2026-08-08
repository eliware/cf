# [![eliware.org](https://eliware.org/logos/brand.png)](https://discord.gg/M6aTR9eTwN)

## @eliware/cf-admin [![npm version](https://img.shields.io/npm/v/@eliware/cf-admin.svg)](https://www.npmjs.com/package/@eliware/cf-admin) [![license](https://img.shields.io/github/license/eliware/cf-admin.svg)](LICENSE) [![build status](https://github.com/eliware/cf-admin/actions/workflows/nodejs.yml/badge.svg)](https://github.com/eliware/cf-admin/actions)

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

## Requirements

- Node.js 26+ required
- Cloudflare API credentials
- Cloudflare account ID for account-scoped resources
- Cloudflare zone ID for zone-scoped resources

## Installation

```sh
cd /opt
git clone git@github.com:eliware/cf-admin.git
cd cf-admin
npm install
npm test
npm run lint
npm install -g .
```

The global install provides:

```sh
cf-admin --help
```

## Configuration

Set credentials in the environment or a local `.env` file:

```env
CLOUDFLARE_EMAIL=you@example.com
CLOUDFLARE_API_KEY=your_api_key
CLOUDFLARE_ACCOUNT_ID=your_account_id
```

Never commit `.env`, credentials, tokens, or generated state.

## Usage

```sh
cf-admin zones list
cf-admin zones get --zone-id <zone_id>
cf-admin dns-records list --zone-id <zone_id>
cf-admin dns-records create --zone-id <zone_id> \
  --data '{"type":"A","name":"www","content":"1.2.3.4"}'
cf-admin rulesets list --zone-id <zone_id> --json
cf-admin zone-settings get --zone-id <zone_id> --setting development_mode
```

Use JSON output for automation:

```sh
cf-admin zones list --json
cf-admin dns-records get --zone-id <zone_id> --id <record_id> --output json
```

Preview supported writes:

```sh
cf-admin dns-records create --zone-id <zone_id> \
  --data '{"type":"A","name":"test","content":"192.0.2.1"}' \
  --dry-run
```

Destructive operations require `--force`:

```sh
cf-admin dns-records delete --zone-id <zone_id> --id <record_id> --force
```

## Resources

- `zones`
- `zone-settings`
- `dns-records`
- `rulesets`
- `lists`
- `list-items`

Run `<resource> --help` for action-specific help.

## Development

```sh
npm test
npm run lint
```

The test suite uses injected Cloudflare clients, filesystem adapters, environment loaders, printers, handlers, and process exits. Current source coverage is 100%.

## Project Structure

- `bin/` - CLI entry point and compatibility link
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
- [GitHub Repo](https://github.com/eliware/cf-admin)
- [GitHub Org](https://github.com/eliware)
- [GitHub Personal](https://github.com/eli-sterling)
- [Discord](https://discord.gg/M6aTR9eTwN)
