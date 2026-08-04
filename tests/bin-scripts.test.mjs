import { jest } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';

function fakeConn() {
  return { execute: jest.fn(), end: jest.fn() };
}

async function importFresh(spec) {
  return import(`${spec}?ts=${Date.now()}`);
}

describe('bin scripts', () => {
  test('cf_ban validates IPs and bans through cloudflare/mysql', async () => {
    const conn = fakeConn();
    const mysqlModule = { createConnection: jest.fn().mockResolvedValue(conn) };
    const cf = { rules: { lists: { items: { create: jest.fn() } } } };
    const log = jest.fn();
    const mod = await importFresh('../bin/cf_ban.mjs');

    const { validateIp } = await import('../src/ip.mjs?ts=' + Date.now());
    expect(() => validateIp('not-an-ip')).toThrow('Invalid IP: not-an-ip');

    await mod.run({
      argv: ['1.2.3.4'],
      env: { CLOUDFLARE_EMAIL: 'e', CLOUDFLARE_API_KEY: 'k', CLOUDFLARE_LIST_ID: 'l', CLOUDFLARE_ACCOUNT_ID: 'a' },
      CloudflareClass: jest.fn(() => cf),
      mysqlModule,
      fsImpl: fs,
      root: fs.mkdtempSync(path.join(os.tmpdir(), 'cf-ban-')),
      printer: { log, error: jest.fn() },
    });

    expect(cf.rules.lists.items.create).toHaveBeenCalledWith('l', { account_id: 'a', body: [{ ip: '1.2.3.4' }] });
    expect(conn.execute).toHaveBeenCalledWith('INSERT INTO ip_bans (ip) VALUES (?) ON DUPLICATE KEY UPDATE ip = VALUES(ip)', ['1.2.3.4']);
    expect(log).toHaveBeenCalledWith('Banned 1.2.3.4');
  });

  test('cf_ban prints usage when args are wrong and protects the hard-coded IP', async () => {
    const mod = await importFresh('../bin/cf_ban.mjs');
    const error = jest.fn();
    const exit = jest.fn();
    await mod.run({ argv: [], printer: { log: jest.fn(), error }, exit });
    await mod.run({ argv: ['24.198.69.82'], printer: { log: jest.fn(), error }, exit });
    expect(error).toHaveBeenCalledWith('Usage: cf_ban <ip>');
    expect(error).toHaveBeenCalledWith('Saved 24.198.69.82 from getting banned... check 404s?');
    expect(exit).toHaveBeenCalledWith(1);
  });

  test('cf_unban removes matching item and deletes from mysql', async () => {
    const conn = fakeConn();
    const mysqlModule = { createConnection: jest.fn().mockResolvedValue(conn) };
    const cf = { rules: { lists: { items: { list: jest.fn().mockReturnValue((async function*(){ yield { id: 'x', ip: '1.2.3.4' }; })()), delete: jest.fn() } } } };
    const log = jest.fn();
    const mod = await importFresh('../bin/cf_unban.mjs');

    await mod.run({
      argv: ['1.2.3.4'],
      env: { CLOUDFLARE_EMAIL: 'e', CLOUDFLARE_API_KEY: 'k', CLOUDFLARE_LIST_ID: 'l', CLOUDFLARE_ACCOUNT_ID: 'a' },
      CloudflareClass: jest.fn(() => cf),
      mysqlModule,
      fsImpl: fs,
      root: fs.mkdtempSync(path.join(os.tmpdir(), 'cf-unban-')),
      printer: { log, error: jest.fn() },
    });

    expect(cf.rules.lists.items.delete).toHaveBeenCalledWith('l', { account_id: 'a', items: [{ id: 'x' }] });
    expect(conn.execute).toHaveBeenCalledWith('DELETE FROM ip_bans WHERE ip = ?', ['1.2.3.4']);
    expect(log).toHaveBeenCalledWith('Unbanned 1.2.3.4');
  });

  test('cf_unban errors when ip is missing from list and usage on wrong args', async () => {
    const conn = fakeConn();
    const mysqlModule = { createConnection: jest.fn().mockResolvedValue(conn) };
    const cf = { rules: { lists: { items: { list: jest.fn().mockReturnValue((async function*(){ yield { id: 'x', ip: '5.5.5.5' }; })()), delete: jest.fn() } } } };
    const mod = await importFresh('../bin/cf_unban.mjs');
    const error = jest.fn();
    await mod.run({ argv: [], printer: { log: jest.fn(), error }, exit: jest.fn() });
    await expect(mod.run({
      argv: ['1.2.3.4'],
      env: { CLOUDFLARE_EMAIL: 'e', CLOUDFLARE_API_KEY: 'k', CLOUDFLARE_LIST_ID: 'l', CLOUDFLARE_ACCOUNT_ID: 'a' },
      CloudflareClass: jest.fn(() => cf),
      mysqlModule,
      fsImpl: fs,
      root: fs.mkdtempSync(path.join(os.tmpdir(), 'cf-unban-')),
      printer: { log: jest.fn(), error: jest.fn() },
    })).rejects.toThrow('IP 1.2.3.4 not found in the list.');
    expect(error).toHaveBeenCalledWith('Usage: cf_unban <ip>');
  });

  test('cf_list truncates and repopulates from cloudflare list and handles missing env', async () => {
    const conn = fakeConn();
    const mysqlModule = { createConnection: jest.fn().mockResolvedValue(conn) };
    const cf = { rules: { lists: { items: { list: jest.fn().mockReturnValue((async function*(){ yield { ip: '1.2.3.4' }; yield { ip: '5.6.7.8' }; })()) } } } };
    const log = jest.fn();
    const mod = await importFresh('../bin/cf_list.mjs');

    await mod.run({
      env: { CLOUDFLARE_EMAIL: 'e', CLOUDFLARE_API_KEY: 'k', CLOUDFLARE_LIST_ID: 'l', CLOUDFLARE_ACCOUNT_ID: 'a' },
      CloudflareClass: jest.fn(() => cf),
      mysqlModule,
      fsImpl: fs,
      root: fs.mkdtempSync(path.join(os.tmpdir(), 'cf-list-')),
      printer: { log, error: jest.fn() },
    });

    expect(log).toHaveBeenNthCalledWith(1, 'Cloudflare IP List:');
    expect(log).toHaveBeenNthCalledWith(2, '1.2.3.4');
    expect(log).toHaveBeenNthCalledWith(3, '5.6.7.8');
    expect(conn.execute).toHaveBeenCalledWith('TRUNCATE TABLE ip_bans');
    expect(conn.execute).toHaveBeenCalledWith('INSERT INTO ip_bans (ip) VALUES (?) ON DUPLICATE KEY UPDATE ip = VALUES(ip)', ['1.2.3.4']);
    expect(conn.execute).toHaveBeenCalledWith('INSERT INTO ip_bans (ip) VALUES (?) ON DUPLICATE KEY UPDATE ip = VALUES(ip)', ['5.6.7.8']);
    await expect(mod.run({ env: {}, CloudflareClass: jest.fn(), mysqlModule, fsImpl: fs, root: fs.mkdtempSync(path.join(os.tmpdir(), 'cf-list-empty-')), printer: { log: jest.fn(), error: jest.fn() } })).rejects.toThrow('Missing CLOUDFLARE_EMAIL or CLOUDFLARE_API_KEY');
  });
});
