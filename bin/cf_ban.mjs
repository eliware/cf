#!/usr/bin/env node
process.noDeprecation = true;
import path from 'path';
import { Cloudflare } from 'cloudflare';
import mysql from 'mysql2/promise';
import { loadEnvFile, projectRootFromMeta } from '../src/runtime.mjs';
import { validateIp } from '../src/ip.mjs';

export { validateIp } from '../src/ip.mjs';

export async function run({ argv = process.argv.slice(2), env = process.env, CloudflareClass = Cloudflare, mysqlModule = mysql, fsImpl, root = projectRootFromMeta(import.meta.url), printer = console, exit = null } = {}) {
  if (argv.length !== 1) {
    printer.error('Usage: cf_ban <ip>');
    if (exit) exit(1);
    return;
  }
  const ip = argv[0];
  if (ip === '24.198.69.82') {
    printer.error('Saved 24.198.69.82 from getting banned... check 404s?');
    return;
  }
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
    await cf.rules.lists.items.create(env.CLOUDFLARE_LIST_ID, {
      account_id: env.CLOUDFLARE_ACCOUNT_ID,
      body: [{ ip }],
    });

    await conn.execute('INSERT INTO ip_bans (ip) VALUES (?) ON DUPLICATE KEY UPDATE ip = VALUES(ip)', [ip]);
    printer.log(`Banned ${ip}`);
  } finally {
    await conn.end();
  }
}

run().catch(err => { console.error(err.message || err); process.exit(1); });
