import { getAccountId, getZoneId, getId, requireAnyValue, requireValue } from './common.mjs';

export async function handleRulesets({ cf, action, opts, body, outputJson, printer = console, toJsonOutput, fail }) {
  const zoneId = getZoneId(opts);
  const accountId = getAccountId(opts);
  const id = getId(opts);
  requireAnyValue([zoneId, accountId], 'Missing --zone-id or --account-id', fail);

  if (action === 'list') {
    const target = zoneId ? await cf.rulesets.list({ zone_id: zoneId }) : await cf.rulesets.list({ account_id: accountId });
    return outputJson ? toJsonOutput(target) : printer.log(JSON.stringify(target, null, 2));
  }

  if (action === 'get') {
    requireValue(id, 'Missing --id', fail);
    const target = zoneId ? await cf.rulesets.get(id, { zone_id: zoneId }) : await cf.rulesets.get(id, { account_id: accountId });
    return outputJson ? toJsonOutput(target) : printer.log(JSON.stringify(target, null, 2));
  }

  if (action === 'create') {
    requireValue(body, 'Missing --data or --file', fail);
    if (opts['dry-run']) return printer.log(JSON.stringify({ zoneId, accountId, action: 'create', body, dryRun: true }, null, 2));
    const target = zoneId ? await cf.rulesets.create({ zone_id: zoneId, ...body }) : await cf.rulesets.create({ account_id: accountId, ...body });
    return outputJson ? toJsonOutput(target) : printer.log(JSON.stringify(target, null, 2));
  }

  if (action === 'update') {
    requireValue(id, 'Missing --id', fail);
    requireValue(body, 'Missing --data or --file', fail);
    if (opts['dry-run']) return printer.log(JSON.stringify({ zoneId, accountId, id, action: 'update', body, dryRun: true }, null, 2));
    const target = zoneId ? await cf.rulesets.update(id, { zone_id: zoneId, ...body }) : await cf.rulesets.update(id, { account_id: accountId, ...body });
    return outputJson ? toJsonOutput(target) : printer.log(JSON.stringify(target, null, 2));
  }

  fail(`Unknown rulesets action: ${action}`);
}
