import { getAccountId, getZoneId, requireValue } from './common.mjs';
import { printTable } from '../output.mjs';

export async function handleZones({ cf, action, opts, body, outputJson, printer = console, toJsonOutput, fail }) {
  const accountId = getAccountId(opts);
  const zoneId = getZoneId(opts);

  if (action === 'list') {
    const res = await cf.zones.list(accountId ? { account: { id: accountId } } : undefined);
    const items = Array.isArray(res?.result) ? res.result : res;
    return outputJson ? toJsonOutput(items) : printTable(['ID', 'NAME'], items.map(z => [z.id, z.name]), printer.log);
  }

  if (action === 'get') {
    requireValue(zoneId, 'Missing --zone-id', fail);
    const zone = await cf.zones.get({ zone_id: zoneId });
    return outputJson ? toJsonOutput(zone) : printer.log(JSON.stringify(zone, null, 2));
  }

  if (action === 'audit') {
    requireValue(zoneId, 'Missing --zone-id', fail);
    const [zone, ssl, dns] = await Promise.all([
      cf.zones.get({ zone_id: zoneId }),
      cf.get(`/zones/${zoneId}/settings/ssl`),
      cf.dns.records.list({ zone_id: zoneId }),
    ]);
    const report = { zone, ssl, dns: Array.isArray(dns?.result) ? dns.result : dns };
    return outputJson ? toJsonOutput(report) : printer.log(JSON.stringify(report, null, 2));
  }

  if (action === 'security') {
    requireValue(zoneId, 'Missing --zone-id', fail);
    const result = await cf.get(`/zones/${zoneId}/settings`);
    const settings = Array.isArray(result?.result) ? result.result : [];
    const names = new Set(['ssl', 'min_tls_version', 'always_use_https', 'tls_1_3']);
    const baseline = settings.filter(setting => names.has(setting.id));
    const report = { zoneId, settings: baseline, missing: [...names].filter(name => !baseline.some(setting => setting.id === name)) };
    return outputJson ? toJsonOutput(report) : printer.log(JSON.stringify(report, null, 2));
  }

  if (action === 'create') {
    requireValue(body, 'Missing --data or --file', fail);
    if (opts['dry-run']) return printer.log(JSON.stringify({ action: 'create', body, dryRun: true }, null, 2));
    const res = await cf.zones.create(body);
    return outputJson ? toJsonOutput(res) : printer.log(JSON.stringify(res, null, 2));
  }

  if (action === 'update') {
    requireValue(zoneId, 'Missing --zone-id', fail);
    requireValue(body, 'Missing --data or --file', fail);
    if (opts['dry-run']) return printer.log(JSON.stringify({ zoneId, action: 'update', body, dryRun: true }, null, 2));
    const res = await cf.zones.edit({ zone_id: zoneId, ...body });
    return outputJson ? toJsonOutput(res) : printer.log(JSON.stringify(res, null, 2));
  }

  if (action === 'delete') {
    requireValue(zoneId, 'Missing --zone-id', fail);
    requireValue(opts.force, 'Refusing to delete without --force', fail);
    const res = await cf.zones.delete({ zone_id: zoneId });
    return outputJson ? toJsonOutput(res) : printer.log(JSON.stringify(res, null, 2));
  }

  fail(`Unknown zones action: ${action}`);
}
