#!/usr/bin/env node
process.noDeprecation = true;
import path from 'path';
import { Cloudflare } from 'cloudflare';
import mysql from 'mysql2/promise';
import { loadEnvFile, projectRootFromMeta } from '../src/runtime.mjs';

function validateIp(ip) {
  const v4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  const v6 = /^([0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{1,4}$/;
  if (!v4.test(ip) && !v6.test(ip)) throw new Error(`Invalid IP: ${ip}`);
}

export async function run({ argv = process.argv.slice(2), env = process.env, CloudflareClass = Cloudflare, mysqlModule = mysql, fsImpl, root = projectRootFromMeta(import.meta.url), printer = console, exit = null } = {}) {
  if (argv.length !== 1) {
    printer.error('Usage: cf_unban <ip>');
    if (exit) exit(1);
    return;
  }
  const ip = argv[0];
  validateIp(ip);

  loadEnvFile(path.join(root, '.env'), env, fsImpl);
  if (!env.CLOUDFLARE_API_KEY || !env.CLOUDFLARE_EMAIL) throw new Error('Missing CLOUDFLARE_EMAIL or CLOUDFLARE_API_KEY');

  const cf = new CloudflareClass({ apiEmail: env.CLOUDFLARE_EMAIL, apiKey: env.CLOUDFLARE_API_KEY });
  const conn = await mysqlModule.createConnection({
    host: env.MYSQL_HOST,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE,
  });

  try {
    let item = null;
    for await (const entry of cf.rules.lists.items.list(env.CLOUDFLARE_LIST_ID, { account_id: env.CLOUDFLARE_ACCOUNT_ID })) {
      if (entry && entry.ip === ip) {
        item = entry;
        break;
      }
    }
    if (!item) throw new Error(`IP ${ip} not found in the list.`);

    await cf.rules.lists.items.delete(env.CLOUDFLARE_LIST_ID, {
      account_id: env.CLOUDFLARE_ACCOUNT_ID,
      items: [{ id: item.id }],
    });

    await conn.execute('DELETE FROM ip_bans WHERE ip = ?', [ip]);
    printer.log(`Unbanned ${ip}`);
  } finally {
    await conn.end();
  }
}

run().catch(err => { console.error(err.message || err); process.exit(1); });
