export function printHelp(printer = console) {
  printer.log(`cf-admin - Cloudflare admin utility

Usage:
  cf-admin --help
  cf-admin <resource> --help
  cf-admin <resource> <action> [options]

Global options:
  --help                 Show help
  --json                 Output JSON
  --output <format>      json|text (default text)
  --force                Confirm destructive writes
  --dry-run              Show what would change without writing
  --account-id <id>      Cloudflare account id
  --zone-id <id>         Cloudflare zone id
  --id <id>              Resource id
  --setting <name>       Zone setting name
  --file <path>          Read JSON body from file
  --data <json>          JSON body inline

Resources:
  zones                  List, inspect, create, edit, delete zones
  zone-settings          Read or edit zone settings
  dns-records            List or manage DNS records
  rulesets               List, inspect, create, or update rulesets
  lists                  List Cloudflare lists
  list-items             List or manage list items

Examples:
  cf-admin zones list
  cf-admin zones get --zone-id <zone_id>
  cf-admin zones create --data '{"account":{"id":"..."},"name":"example.com","type":"full"}'
  cf-admin zone-settings get --zone-id <zone_id> --setting development_mode
  cf-admin zone-settings set --zone-id <zone_id> --setting development_mode --data '{"value":"on"}'
  cf-admin dns-records list --zone-id <zone_id>
  cf-admin dns-records create --zone-id <zone_id> --data '{"type":"A","name":"www","content":"1.2.3.4"}'
  cf-admin rulesets list --zone-id <zone_id>
  cf-admin rulesets update --zone-id <zone_id> --id <ruleset_id> --file ruleset.json
  cf-admin lists list --account-id <account_id>
  cf-admin list-items list --account-id <account_id> --id <list_id>
`);
}

export function printResourceHelp(resource, printer = console) {
  const map = {
    zones: `zones
  list                 List zones
  get                  Get zone details
  create               Create zone
  update               Edit zone
  delete               Delete zone`,
    'zone-settings': `zone-settings
  get                  Get one zone setting
  set                  Update one zone setting`,
    'dns-records': `dns-records
  list                 List DNS records
  get                  Get DNS record
  create               Create DNS record
  update               Update DNS record
  delete               Delete DNS record`,
    rulesets: `rulesets
  list                 List rulesets
  get                  Get ruleset
  create               Create ruleset
  update               Update ruleset`,
    lists: `lists
  list                 List lists
  get                  Get list`,
    'list-items': `list-items
  list                 List items in a list
  create               Add item to a list
  delete               Delete item from a list`,
  };
  printer.log(map[resource] || `Unknown resource: ${resource}`);
}
