export function printDetailedHelp(printer = console) {
  printer.log(`cf - Cloudflare admin utility

Usage:
  cf --help
  cf <resource> --help
  cf <resource> <action> [options]

Global options:
  --help                 Show help
  --version              Show version
  --json                 Output JSON
  --output <format>      json|text (default text)
  --jq <expression>      Select fields from JSON output (basic jq paths)
  --quiet                Suppress normal command output
  --pager                Pipe human-readable output through the configured pager
  --no-pager             Disable paging for this invocation
  --color <mode>         always|never|auto (default auto)
  --width <columns>      Terminal output width override
  --verbose              Include verbose diagnostics where supported
  --paginate              Fetch all pages for supported list/API requests
  --template <text>       Render JSON values with {{.field}} placeholders
  --web                   Print the Cloudflare dashboard link
  --force                Confirm destructive writes
  --dry-run              Show what would change without writing
  --account-id <id>      Cloudflare account id
  --zone-id <id>         Cloudflare zone id
  --id <id>              Resource id
  --setting <name>       Zone setting name
  --file <path>          Read JSON body from file
  --data <json>          JSON body inline
  --method <method>      API method for cf api (default GET)

Use the resource names shown above directly; define personal shortcuts with
'cf alias set' when needed.

Resources:
  zones                  List, inspect, create, edit, delete zones
  zone-settings          Read or edit zone settings
  dns-records            List or manage DNS records
  rulesets               List, inspect, create, or update rulesets
  lists                  List Cloudflare lists
  list-items             List or manage list items
  api                    Call any relative Cloudflare API path
  auth                   Inspect Cloudflare authentication context
  ssl                    Inspect or configure zone SSL/TLS settings
  cache                  Purge zone cache
  health                 Inspect zone health checks
  audit                  Inspect account audit logs
  inventory              Export account inventory
  origin-ca              Manage Origin CA certificates
  load-balancer           Manage zone Load Balancers
  tunnel                  Manage account tunnels
  workers                 Manage Workers resources
  pages                   Manage Pages projects
  r2                      Manage R2 buckets
  d1                      Manage D1 databases
  queues                  Manage Queues
  stream                  Manage Stream resources
  images                  Manage Images
  ai                      Manage AI resources
  access                  Manage Access applications
  extension               Manage local cf extensions

Examples:
  cf zones list
  cf zones get --zone-id <zone_id>
  cf zones create --data '{"account":{"id":"..."},"name":"example.com","type":"full"}'
  cf zone-settings get --zone-id <zone_id> --setting development_mode
  cf zone-settings set --zone-id <zone_id> --setting development_mode --data '{"value":"on"}'
  cf dns-records list --zone-id <zone_id>
  cf dns-records create --zone-id <zone_id> --data '{"type":"A","name":"www","content":"1.2.3.4"}'
  cf rulesets list --zone-id <zone_id>
  cf rulesets update --zone-id <zone_id> --id <ruleset_id> --file ruleset.json
  cf lists list --account-id <account_id>
  cf list-items list --account-id <account_id> --id <list_id>
  cf zones list
  cf api /zones --json
  cf api zones/<zone_id>/dns_records --json
  cf auth status
  cf auth login --profile work                 # OAuth browser flow (default)
  printf '%s' "$CLOUDFLARE_API_TOKEN" | cf auth login --profile ci --token-stdin
  cf auth switch --profile work
  cf auth logout --profile work
  cf ssl get --zone-id <zone_id>
  cf cache purge --zone-id <zone_id> --data '{"purge_everything":true}' --force
  cf health list --zone-id <zone_id>
  cf audit list --account-id <account_id>
  cf inventory export --account-id <account_id> --json
  cf origin-ca list --json
`);
}

export function printHelp(printer = console) {
  printer.log(`Manage Cloudflare from the command line.

USAGE
  cf <command> <subcommand> [flags]

CORE COMMANDS
  auth:          Authenticate and manage Cloudflare profiles
  zones:         Manage zones
  dns-records:   Manage DNS records
  zone-settings: Manage zone settings
  rulesets:      Manage rulesets
  lists:         Manage account lists
  ssl:           Inspect and configure SSL/TLS
  api:           Make an authenticated Cloudflare API request

ACCOUNT COMMANDS
  audit:         View account audit logs
  inventory:     Export account inventory
  origin-ca:     Manage Origin CA certificates
  load-balancer: Manage zone Load Balancers
  tunnel:        Manage account tunnels

PLATFORM COMMANDS
  workers:       Manage Workers
  pages:         Manage Pages projects
  r2:            Manage R2 buckets
  d1:            Manage D1 databases
  queues:        Manage Queues
  stream:        Manage Stream
  images:        Manage Images
  ai:            Manage AI and Vectorize
  access:        Manage Access and Zero Trust
  extension:     Manage local cf extensions
  alias:          Manage command aliases
  config:         Manage local cf settings

FLAGS
  --help         Show help for command
  --version      Show version
  --json         Output JSON
  --output       json|text (default text)
  --jq           Select fields from JSON output
  --template     Render JSON values with {{.field}} placeholders
  --quiet        Suppress normal output
  --pager        Page human-readable output
  --no-pager     Disable paging
  --color        always|never|auto
  --width        Terminal width override
  --verbose      Include diagnostic details
  --paginate     Fetch all supported pages
  --web          Open a Cloudflare dashboard link
  --force        Confirm destructive actions
  --dry-run      Show changes without writing
  --account-id   Cloudflare account id
  --zone-id      Cloudflare zone id
  --file         Read a JSON request body
  --data         Use an inline JSON request body

EXAMPLES
  $ cf zones list
  $ cf dns-records list --zone-id <zone_id>
  $ cf api /zones --json
  $ cf auth status
  $ cf extension list

LEARN MORE
  Use 'cf <command> <subcommand> --help' for more information.
  Use the resource names shown above directly; define personal shortcuts with
  'cf alias set' when needed.`);
}

export function printResourceHelp(resource, printer = console) {
  const map = {
    zones: `zones
  list                 List zones
  get                  Get zone details
  audit                Audit zone metadata, SSL, and DNS
  security             Check zone security baseline
  create               Create zone
  update               Edit zone
  delete               Delete zone`,
    "zone-settings": `zone-settings
  get                  Get one zone setting
  set                  Update one zone setting`,
    "dns-records": `dns-records
  list                 List DNS records
  get                  Get DNS record
  create               Create DNS record
  update               Update DNS record
  delete               Delete DNS record
  diff                 Compare DNS records with desired JSON
  apply                Apply a DNS diff (requires --force)`,
    rulesets: `rulesets
  list                 List rulesets
  get                  Get ruleset
  create               Create ruleset
  update               Update ruleset`,
    lists: `lists
  list                 List lists
  get                  Get list`,
    "list-items": `list-items
  list                 List items in a list
  create               Add item to a list
  delete               Delete item from a list`,
    api: `api
  /path                Call any relative Cloudflare API path

  Options: --method GET|POST|PUT|PATCH|DELETE, --data, --file,
  --json, --dry-run, and --force for DELETE`,
    auth: `auth
  status               Verify the active Cloudflare identity
  verify               Verify the active API token
  list                 Show configured credential contexts
  login                Save a profile (OAuth browser flow by default; --token-stdin for API tokens)
  switch               Activate a saved profile
  logout               Remove a saved profile
  verify               Verify the active API token`,
    ssl: `ssl
  get                  Read a zone SSL/TLS setting
  set                  Update a zone SSL/TLS setting
  certificates         List certificate packs
  coverage             Summarize certificate host coverage`,
    cache: `cache
  purge                Purge zone cache (requires --force)`,
    health: `health
  list                 List zone health checks
  get                  Get a health check
  create               Create a health check
  delete               Delete a health check (requires --force)`,
    audit: `audit
  list                 List account audit logs`,
    inventory: `inventory
  export               Export zones, DNS records, and SSL settings`,
    "origin-ca": `origin-ca
  list                 List Origin CA certificates
  create               Create an Origin CA certificate
  revoke               Revoke a certificate (requires --force)`,
    "load-balancer": `load-balancer
  list/get/create/update/delete  Manage zone Load Balancers`,
    tunnel: `tunnel
  list/get/create/update/delete  Manage account tunnels`,
    extension: `extension
  list                 List installed extensions
  info                 Show installed extension metadata
  install              Install from a local extension directory
  upgrade              Replace an installed extension from a local directory
  remove               Remove an extension (requires --force)`,
    alias: `alias
  list                 List saved command aliases
  set <name> <command> Save a command alias
  delete <name>        Delete a command alias`,
    config: `config
  list                 List saved configuration
  get <name>           Read a configuration value
  set <name> <value>   Save a configuration value
  unset <name>         Remove a configuration value`,
  };
  printer.log(map[resource] || `Unknown resource: ${resource}`);
}

const commandHelp = {
  "auth login": `Authenticate with Cloudflare.

USAGE
  cf auth login [flags]

The default authentication mode is a browser-based OAuth flow. The profile is
stored in the native credential store when available. Use --token-stdin for
headless API-token authentication.

FLAGS
  --profile <name>       Save and activate this profile (default: default)
  --token-stdin          Read an API token from standard input
  --oauth                Explicitly select the OAuth browser flow
  --account-id <id>      Associate an account with the profile
  --zone-id <id>         Associate a zone with the profile

ENVIRONMENT
  CF_OAUTH_CLIENT_ID     Override the public OAuth client
  CF_OAUTH_SCOPES        Comma-separated OAuth scopes
  CF_OAUTH_BIND_HOST     Local callback listener address (default: 0.0.0.0)
  CF_OAUTH_REDIRECT_HOST OAuth redirect host (default: 127.0.0.1)

EXAMPLES
  $ cf auth login
  $ cf auth login --profile work
  $ printf '%s' "$CLOUDFLARE_API_TOKEN" | cf auth login --token-stdin
  $ cf auth login --oauth --profile work`,
  "auth status": `Show the active Cloudflare identity.

USAGE
  cf auth status [flags]

EXAMPLES
  $ cf auth status
  $ cf auth status --json`,
  "auth switch": `Activate a saved Cloudflare profile.

USAGE
  cf auth switch --profile <name>

EXAMPLES
  $ cf auth switch --profile work`,
  "auth logout": `Remove a saved Cloudflare profile.

USAGE
  cf auth logout [--profile <name>]

EXAMPLES
  $ cf auth logout --profile work`,
  "zones list": `List zones available to the active profile.

USAGE
  cf zones list [flags]

FLAGS
  --paginate              Fetch all supported pages
  --json                  Emit machine-readable JSON

EXAMPLES
  $ cf zones list
  $ cf zones list --json`,
  "dns-records list": `List DNS records in a zone.

USAGE
  cf dns-records list --zone-id <zone_id> [flags]

FLAGS
  --zone-id <id>          Zone to inspect
  --paginate              Fetch all pages
  --json                  Emit machine-readable JSON

EXAMPLES
  $ cf dns-records list --zone-id <zone_id>`,
  "dns-records create": `Create a DNS record.

USAGE
  cf dns create --zone-id <zone_id> (--data <json> | --file <path>) [flags]

EXAMPLES
  $ cf dns create --zone-id <zone_id> --data '{"type":"A","name":"www","content":"1.2.3.4"}'`,
  "dns-records delete": `Delete a DNS record.

USAGE
  cf dns delete --zone-id <zone_id> --id <record_id> --force

The --force flag is required for destructive operations.`,
  api: `Call any relative Cloudflare API path.

USAGE
  cf api <path> [flags]

FLAGS
  --method <method>       GET, POST, PUT, PATCH, or DELETE
  --data <json>           Inline JSON request body
  --file <path>           Read JSON request body from a file
  --dry-run               Show the request without writing
  --force                 Required for DELETE requests
  --paginate              Fetch all supported pages

EXAMPLES
  $ cf api /zones --json
  $ cf api zones/<zone_id>/dns_records --method GET`,
  "cache purge": `Purge a zone's cache.

USAGE
  cf cache purge --zone-id <zone_id> --force [flags]

The --force flag is required because this operation cannot be undone.

EXAMPLES
  $ cf cache purge --zone-id <zone_id> --data '{"purge_everything":true}' --force`,
  "ssl set": `Update a zone SSL/TLS setting.

USAGE
  cf ssl set --zone-id <zone_id> --setting <name> --data <json> [flags]

EXAMPLES
  $ cf ssl set --zone-id <zone_id> --setting mode --data '{"value":"strict"}'`,
  "origin-ca revoke": `Revoke an Origin CA certificate.

USAGE
  cf origin-ca revoke --id <certificate_id> --force

The --force flag is required for destructive operations.`,
  "extension remove": `Remove an installed extension.

USAGE
  cf extension remove <name> --force

The --force flag is required for destructive operations.`,
  "alias set": `Save a command alias.

USAGE
  cf alias set <name> <command...>

EXAMPLES
  $ cf alias set work 'zones list'`,
  "alias delete": `Delete a saved command alias.

USAGE
  cf alias delete <name>

EXAMPLES
  $ cf alias delete zones`,
  "config set": `Save a local cf configuration value.

USAGE
  cf config set <name> <value>`,
  "config unset": `Remove a local cf configuration value.

USAGE
  cf config unset <name>`,
};

export function printCommandHelp(resource, action, printer = console) {
  const key = `${resource} ${action || ""}`.trim();
  printer.log(
    commandHelp[key] ||
      `${resource} ${action || ""}\n\nUSAGE\n  cf ${resource} ${action || "<subcommand>"} [flags]\n\nUse 'cf ${resource} --help' for available subcommands.`,
  );
}
