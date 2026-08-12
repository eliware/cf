# OAuth scope guidance

The public CLI client starts with read-only scopes:

| CLI capability | OAuth scope |
| --- | --- |
| Zone discovery | `zone.read` |
| Account settings and membership context | `account-settings.read` |
| Account lists | `account-rule-lists.read` |
| User identity | `user-details.read` |

Additional commands require the corresponding Cloudflare resource scope. Add
only the scopes required by the commands an installation will use. The current
catalog is authoritative and can be queried with `cf api /oauth/scopes --json`.
Write, purge, token-management, and certificate permissions should not be
added to the default public client without a specific need.
