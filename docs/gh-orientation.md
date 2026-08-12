# From `gh` to `cf`

`cf` follows the same resource/action shape as the GitHub CLI:

```text
gh <resource> <action> [flags]
cf <resource> <action> [flags]
```

Common translations:

| GitHub CLI habit | Cloudflare CLI equivalent |
| --- | --- |
| `gh repo list` | `cf zone list` |
| `gh api <endpoint>` | `cf api <endpoint>` |
| `gh auth status` | `cf auth status` |
| `gh auth login` | `cf auth login --profile <name>` (defaults to OAuth) |
| `gh auth switch` | `cf auth switch --profile <name>` |
| `gh auth logout` | `cf auth logout --profile <name>` |
| `--json` / field filtering | `--json --jq '.result[].name'` |
| preview a mutation | `--dry-run` |

Cloudflare-specific resources use singular names (`zone`, `dns`, `setting`,
`rules`, and `list`). The original plural names remain compatibility aliases.
The universal `cf api` command accepts any relative Cloudflare API path, so a
dedicated resource command is never required before an endpoint can be used.

Human-readable output supports the same terminal-friendly workflow expected
from `gh`: set `cf config set pager less`, use `--pager` for one command, or
use `--no-pager` to override it. `--color always|never|auto` controls table
headers, and `--width <columns>` provides a deterministic width for scripts or
narrow terminals. JSON output is never paged or colorized.

Credentials may come from `~/.cf`, the project `.env`, CI environment variables,
or named profiles stored in `~/.config/cf/profiles.json` with mode 0600. Like
`gh`, `CF_CONFIG_DIR` overrides the configuration directory and
`XDG_CONFIG_HOME/cf` is used when `XDG_CONFIG_HOME` is set. When the optional
OS keychain adapter is available, `cf auth login` stores secrets in the native
credential store and leaves only profile metadata in `profiles.json`; otherwise
it safely falls back to the 0600 file. API tokens are preferred; the
email/API-key pair remains supported for compatibility.

Interactive login uses Cloudflare Authorization Code + PKCE OAuth. Register
these localhost callback URLs on the OAuth client so the CLI can fall back when
one port is busy:

```text
http://127.0.0.1:8765/oauth/callback
http://127.0.0.1:8766/oauth/callback
http://127.0.0.1:8767/oauth/callback
http://127.0.0.1:8768/oauth/callback
http://127.0.0.1:8769/oauth/callback
```

Then run `cf auth login --profile work --oauth`; the public Eliware client ID
is built in. `CF_OAUTH_CLIENT_ID=...` overrides it for a different client. The
default requested scopes are `account-settings.read,zone.read,account-rule-lists.read,user-details.read`; set
`CF_OAUTH_SCOPES=account-settings.read,zone.read,...` to request additional scopes that
are registered on the client. For a remote browser over Tailscale, bind the
callback and use the server's Tailscale address, registering the matching URI:

```sh
CF_OAUTH_BIND_HOST=100.112.180.56 cf auth login --profile work --oauth
```

The default listener binds to `0.0.0.0`; `CF_OAUTH_BIND_HOST` overrides it. The
authorization request and registered redirect remain `127.0.0.1`. If the
browser is remote, replace only the redirected URL host with the server's
Tailscale address before loading it. Binding to `0.0.0.0` should only be used
with a trusted network path and firewall; loopback plus SSH forwarding remains
safer.
