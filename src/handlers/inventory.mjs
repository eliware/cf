import { getAccountId, requireValue } from './common.mjs';

export async function handleInventory({ cf, action, opts, outputJson, printer, toJsonOutput, fail }) {
  const accountId = getAccountId(opts);
  requireValue(accountId, 'Missing --account-id', fail);
  if (action !== 'export') { fail(`Unknown inventory action: ${action}`); return; }
  const zonesResponse = await cf.zones.list({ account: { id: accountId } });
  const zones = Array.isArray(zonesResponse?.result) ? zonesResponse.result : [];
  const inventory = await Promise.all(zones.map(async zone => {
    const [records, ssl] = await Promise.all([
      cf.dns.records.list({ zone_id: zone.id }),
      cf.get(`/zones/${zone.id}/settings/ssl`),
    ]);
    return { id: zone.id, name: zone.name, status: zone.status, records: Array.isArray(records?.result) ? records.result : [], ssl };
  }));
  const result = { accountId, zones: inventory };
  return outputJson ? toJsonOutput(result) : printer.log(JSON.stringify(result, null, 2));
}
