export function printHelp(printer = console) {
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
  --verbose              Include verbose diagnostics where supported
  --paginate              Fetch all pages for supported list/API requests
  --force                Confirm destructive writes
  --dry-run              Show what would change without writing
  --account-id <id>      Cloudflare account id
  --zone-id <id>         Cloudflare zone id
  --id <id>              Resource id
  --setting <name>       Zone setting name
  --file <path>          Read JSON body from file
  --data <json>          JSON body inline
  --method <method>      API method for cf api (default GET)

Compatibility: singular resources (zone, dns, setting, rules, list)
are preferred; plural resource names remain supported aliases.

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
  cf zone list
  cf api /zones --json
  cf api zones/<zone_id>/dns_records --json
  cf auth status
  cf auth login --profile work
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

export function printResourceHelp(resource, printer = console) {
  const map = {
    zones: `zones (alias: zone)
  list                 List zones
  get                  Get zone details
  audit                Audit zone metadata, SSL, and DNS
  security             Check zone security baseline
  create               Create zone
  update               Edit zone
  delete               Delete zone`,
    'zone-settings': `zone-settings (alias: setting)
  get                  Get one zone setting
  set                  Update one zone setting`,
    'dns-records': `dns-records (alias: dns)
  list                 List DNS records
  get                  Get DNS record
  create               Create DNS record
  update               Update DNS record
  delete               Delete DNS record
  diff                 Compare DNS records with desired JSON
  apply                Apply a DNS diff (requires --force)`,
    rulesets: `rulesets (alias: rules)
  list                 List rulesets
  get                  Get ruleset
  create               Create ruleset
  update               Update ruleset`,
    lists: `lists (alias: list)
  list                 List lists
  get                  Get list`,
    'list-items': `list-items (alias: list-item)
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
  login                Save current environment credentials as a profile
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
    'origin-ca': `origin-ca
  list                 List Origin CA certificates
  create               Create an Origin CA certificate
  revoke               Revoke a certificate (requires --force)`,
  };
  printer.log(map[resource] || `Unknown resource: ${resource}`);
}
