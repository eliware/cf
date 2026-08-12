import { getAccountId, getId, requireValue } from './common.mjs';
import { printTable } from '../output.mjs';

export async function handleLists({ cf, action, opts, outputJson, printer = console, toJsonOutput, fail }) {
  const accountId = getAccountId(opts);
  const id = getId(opts);
  requireValue(accountId, 'Missing --account-id or CLOUDFLARE_ACCOUNT_ID', fail);

  if (action === 'list') {
    const items = [];
    for await (const list of cf.rules.lists.list({ account_id: accountId })) items.push(list);
    return outputJson ? toJsonOutput(items) : printTable(['ID', 'NAME'], items.map(l => [l.id, l.name]), printer.log);
  }

  if (action === 'get') {
    requireValue(id, 'Missing --id', fail);
    const res = await cf.rules.lists.get(id, { account_id: accountId });
    return outputJson ? toJsonOutput(res) : printer.log(JSON.stringify(res, null, 2));
  }

  fail(`Unknown lists action: ${action}`);
}
