import { getAccountId, requireValue } from './common.mjs';

export async function handleAudit({ cf, action, opts, outputJson, printer, toJsonOutput, fail }) {
  const accountId = getAccountId(opts);
  requireValue(accountId, 'Missing --account-id', fail);
  if (action !== 'list') { fail(`Unknown audit action: ${action}`); return; }
  const result = await cf.get(`/accounts/${accountId}/audit_logs`);
  return outputJson ? toJsonOutput(result) : printer.log(JSON.stringify(result, null, 2));
}
