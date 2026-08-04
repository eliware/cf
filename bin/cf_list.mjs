#!/usr/bin/env node
process.noDeprecation = true;
import path from 'path';
import { pathToFileURL } from 'url';
import { Cloudflare } from 'cloudflare';
import mysql from 'mysql2/promise';
import { loadEnvFile, projectRootFromMeta } from '../src/runtime.mjs';

export async function run({ env = process.env, CloudflareClass = Cloudflare, mysqlModule = mysql, fsImpl, root = projectRootFromMeta(import.meta.url), printer = console } = {}) {
  loadEnvFile(path.join(root, '.env'), env, fsImpl);
  if (!env.CLOUDFLARE_API_KEY || !env.CLOUDFLARE_EMAIL) throw new Error('Missing CLOUDFLARE_EMAIL or CLOUDFLARE_API_KEY');
  printer.log('Cloudflare IP List:');

  const cf = new CloudflareClass({ apiEmail: env.CLOUDFLARE_EMAIL, apiKey: env.CLOUDFLARE_API_KEY });
  const conn = await mysqlModule.createConnection({
    host: env.MYSQL_HOST,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE,
  });

  const ips = [];
  for await (const item of cf.rules.lists.items.list(env.CLOUDFLARE_LIST_ID, { account_id: env.CLOUDFLARE_ACCOUNT_ID })) {
    if (item && item.ip) ips.push(item.ip);
  }

  await conn.execute('TRUNCATE TABLE ip_bans');
  for (const ip of ips) {
    await conn.execute('INSERT INTO ip_bans (ip) VALUES (?) ON DUPLICATE KEY UPDATE ip = VALUES(ip)', [ip]);
  }
  for (const ip of ips) printer.log(ip);
  await conn.end();
}

const entryPoint = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === entryPoint || process.argv[1] === '/usr/bin/cf_list') {
  run().catch(err => { console.error(err.message || err); process.exit(1); });
}
