import { jest } from '@jest/globals';
import { handleZones } from '../src/handlers/zones.mjs';
import { handleZoneSettings } from '../src/handlers/zone-settings.mjs';
import { handleDnsRecords } from '../src/handlers/dns-records.mjs';
import { handleRulesets } from '../src/handlers/rulesets.mjs';
import { handleLists } from '../src/handlers/lists.mjs';
import { handleListItems } from '../src/handlers/list-items.mjs';

describe('Cloudflare handlers', () => {
  let fail;
  let toJsonOutput;
  let log;

  beforeEach(() => {
    fail = jest.fn(msg => { throw new Error(msg); });
    toJsonOutput = jest.fn();
    log = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    log.mockRestore();
  });

  test('handleZones list prints simplified text rows when not JSON', async () => {
    const cf = { zones: { list: jest.fn().mockResolvedValue({ result: [{ id: 'z1', name: 'example.com' }] }) } };
    await handleZones({ cf, action: 'list', opts: {}, outputJson: false, toJsonOutput, fail });
    expect(cf.zones.list).toHaveBeenCalledWith(undefined);
    expect(console.log).toHaveBeenCalledWith('z1 example.com');
  });

  test('handleZones supports account-scoped list and JSON output', async () => {
    const cf = { zones: { list: jest.fn().mockResolvedValue([{ id: 'z2', name: 'example.net' }]) } };
    await handleZones({ cf, action: 'list', opts: { 'account-id': 'acct1' }, outputJson: true, toJsonOutput, fail });
    expect(cf.zones.list).toHaveBeenCalledWith({ account: { id: 'acct1' } });
    expect(toJsonOutput).toHaveBeenCalledWith([{ id: 'z2', name: 'example.net' }]);
  });

  test('handleZones get/update/delete and unknown action are covered', async () => {
    const cf = {
      zones: {
        get: jest.fn().mockResolvedValue({ id: 'z1' }),
        edit: jest.fn().mockResolvedValue({ ok: true }),
        delete: jest.fn().mockResolvedValue({ deleted: true }),
      },
    };
    await handleZones({ cf, action: 'get', opts: { 'zone-id': 'z1' }, outputJson: true, toJsonOutput, fail });
    await handleZones({ cf, action: 'update', opts: { 'zone-id': 'z1' }, body: { name: 'x' }, outputJson: false, toJsonOutput, fail });
    await handleZones({ cf, action: 'delete', opts: { 'zone-id': 'z1', force: true }, outputJson: true, toJsonOutput, fail });
    await expect(handleZones({ cf, action: 'bogus', opts: {}, outputJson: false, toJsonOutput, fail })).rejects.toThrow('Unknown zones action: bogus');
    expect(cf.zones.get).toHaveBeenCalledWith({ zone_id: 'z1' });
    expect(cf.zones.edit).toHaveBeenCalledWith({ zone_id: 'z1', name: 'x' });
    expect(cf.zones.delete).toHaveBeenCalledWith({ zone_id: 'z1' });
  });

  test('handleZones create respects dry-run and real create', async () => {
    const cf = { zones: { create: jest.fn().mockResolvedValue({ created: true }) } };
    await handleZones({ cf, action: 'create', opts: { 'dry-run': true }, body: { name: 'x' }, outputJson: false, toJsonOutput, fail });
    await handleZones({ cf, action: 'create', opts: {}, body: { name: 'x' }, outputJson: true, toJsonOutput, fail });
    expect(cf.zones.create).toHaveBeenCalledWith({ name: 'x' });
  });

  test('handleZoneSettings get/set/unknown', async () => {
    const cf = { zones: { settings: { get: jest.fn().mockResolvedValue({ value: 'on' }), update: jest.fn().mockResolvedValue({ value: 'off' }) } } };
    await handleZoneSettings({ cf, action: 'get', opts: { 'zone-id': 'z1', setting: 'dev' }, outputJson: true, toJsonOutput, fail });
    await handleZoneSettings({ cf, action: 'set', opts: { 'zone-id': 'z1', setting: 'dev' }, body: { value: 'off' }, outputJson: false, toJsonOutput, fail });
    await expect(handleZoneSettings({ cf, action: 'noop', opts: { 'zone-id': 'z1', setting: 'dev' }, outputJson: false, toJsonOutput, fail })).rejects.toThrow('Unknown zone-settings action: noop');
    expect(cf.zones.settings.get).toHaveBeenCalledWith('z1', 'dev');
    expect(cf.zones.settings.update).toHaveBeenCalledWith('z1', 'dev', { value: 'off' });
  });

  test('handleZoneSettings validates missing zone, setting, and value', async () => {
    const cf = { zones: { settings: { get: jest.fn(), update: jest.fn() } } };
    await expect(handleZoneSettings({ cf, action: 'get', opts: { setting: 'dev' }, outputJson: false, toJsonOutput, fail })).rejects.toThrow('Missing --zone-id');
    await expect(handleZoneSettings({ cf, action: 'get', opts: { 'zone-id': 'z1' }, outputJson: false, toJsonOutput, fail })).rejects.toThrow('Missing --setting');
    await expect(handleZoneSettings({ cf, action: 'set', opts: { 'zone-id': 'z1', setting: 'dev' }, body: {}, outputJson: false, toJsonOutput, fail })).rejects.toThrow('Missing JSON body with value');
  });

  test('handleDnsRecords list/get/create/update/delete/unknown', async () => {
    const cf = {
      dns: {
        records: {
          list: jest.fn().mockResolvedValue({ result: [{ id: 'r1', type: 'A', name: 'www', content: '1.2.3.4' }] }),
          get: jest.fn().mockResolvedValue({ id: 'r1' }),
          create: jest.fn().mockResolvedValue({ created: true }),
          update: jest.fn().mockResolvedValue({ updated: true }),
          delete: jest.fn().mockResolvedValue({ deleted: true }),
        },
      },
    };
    await handleDnsRecords({ cf, action: 'list', opts: { 'zone-id': 'z1' }, outputJson: false, toJsonOutput, fail });
    await handleDnsRecords({ cf, action: 'get', opts: { 'zone-id': 'z1', id: 'r1' }, outputJson: true, toJsonOutput, fail });
    await handleDnsRecords({ cf, action: 'create', opts: { 'zone-id': 'z1' }, body: { type: 'A' }, outputJson: false, toJsonOutput, fail });
    await handleDnsRecords({ cf, action: 'update', opts: { 'zone-id': 'z1', id: 'r1' }, body: { content: '5.6.7.8' }, outputJson: true, toJsonOutput, fail });
    await handleDnsRecords({ cf, action: 'delete', opts: { 'zone-id': 'z1', id: 'r1', force: true }, outputJson: false, toJsonOutput, fail });
    await expect(handleDnsRecords({ cf, action: 'bogus', opts: { 'zone-id': 'z1' }, outputJson: false, toJsonOutput, fail })).rejects.toThrow('Unknown dns-records action: bogus');
    expect(console.log).toHaveBeenCalledWith('r1 A www 1.2.3.4');
  });

  test('handleDnsRecords validates missing inputs', async () => {
    const cf = { dns: { records: { list: jest.fn() } } };
    await expect(handleDnsRecords({ cf, action: 'list', opts: {}, outputJson: false, toJsonOutput, fail })).rejects.toThrow('Missing --zone-id');
    await expect(handleDnsRecords({ cf, action: 'get', opts: { 'zone-id': 'z1' }, outputJson: false, toJsonOutput, fail })).rejects.toThrow('Missing --id');
    await expect(handleDnsRecords({ cf, action: 'create', opts: { 'zone-id': 'z1' }, outputJson: false, toJsonOutput, fail })).rejects.toThrow('Missing --data or --file');
    await expect(handleDnsRecords({ cf, action: 'update', opts: { 'zone-id': 'z1', id: 'r1' }, outputJson: false, toJsonOutput, fail })).rejects.toThrow('Missing --data or --file');
    await expect(handleDnsRecords({ cf, action: 'delete', opts: { 'zone-id': 'z1', id: 'r1' }, outputJson: false, toJsonOutput, fail })).rejects.toThrow('Refusing to delete without --force');
  });

  test('handleRulesets list/get/create/update/unknown and validations', async () => {
    const cf = { rulesets: { list: jest.fn().mockResolvedValue([{ id: 'r1' }]), get: jest.fn().mockResolvedValue({ id: 'r1' }), create: jest.fn().mockResolvedValue({ created: true }), update: jest.fn().mockResolvedValue({ updated: true }) } };
    await handleRulesets({ cf, action: 'list', opts: { 'zone-id': 'z1' }, outputJson: true, toJsonOutput, fail });
    await handleRulesets({ cf, action: 'get', opts: { 'account-id': 'acct1', id: 'r1' }, outputJson: true, toJsonOutput, fail });
    await handleRulesets({ cf, action: 'create', opts: { 'account-id': 'acct1' }, body: { name: 'x' }, outputJson: false, toJsonOutput, fail });
    await handleRulesets({ cf, action: 'update', opts: { 'zone-id': 'z1', id: 'r1' }, body: { name: 'y' }, outputJson: true, toJsonOutput, fail });
    await expect(handleRulesets({ cf, action: 'bogus', opts: { 'zone-id': 'z1' }, outputJson: false, toJsonOutput, fail })).rejects.toThrow('Unknown rulesets action: bogus');
    expect(cf.rulesets.list).toHaveBeenCalledWith({ zone_id: 'z1' });
    expect(cf.rulesets.get).toHaveBeenCalledWith('r1', { account_id: 'acct1' });
    expect(cf.rulesets.create).toHaveBeenCalledWith({ account_id: 'acct1', name: 'x' });
    expect(cf.rulesets.update).toHaveBeenCalledWith('r1', { zone_id: 'z1', name: 'y' });
  });

  test('handleRulesets validates missing values and dry-run', async () => {
    const cf = { rulesets: { list: jest.fn(), get: jest.fn(), create: jest.fn(), update: jest.fn() } };
    await expect(handleRulesets({ cf, action: 'list', opts: {}, outputJson: false, toJsonOutput, fail })).rejects.toThrow('Missing --zone-id or --account-id');
    await expect(handleRulesets({ cf, action: 'get', opts: { 'zone-id': 'z1' }, outputJson: false, toJsonOutput, fail })).rejects.toThrow('Missing --id');
    await expect(handleRulesets({ cf, action: 'create', opts: { 'zone-id': 'z1' }, outputJson: false, toJsonOutput, fail })).rejects.toThrow('Missing --data or --file');
    await expect(handleRulesets({ cf, action: 'update', opts: { 'zone-id': 'z1', id: 'r1' }, outputJson: false, toJsonOutput, fail })).rejects.toThrow('Missing --data or --file');
    await handleRulesets({ cf, action: 'create', opts: { 'zone-id': 'z1', 'dry-run': true }, body: { name: 'x' }, outputJson: false, toJsonOutput, fail });
    expect(console.log).toHaveBeenCalled();
  });

  test('handleLists list/get/unknown and validation', async () => {
    async function* iterator() { yield { id: 'l1', name: 'list1' }; }
    const cf = { rules: { lists: { list: jest.fn().mockReturnValue(iterator()), get: jest.fn().mockResolvedValue({ id: 'l1' }) } } };
    await handleLists({ cf, action: 'list', opts: { 'account-id': 'acct1' }, outputJson: false, toJsonOutput, fail });
    await handleLists({ cf, action: 'get', opts: { 'account-id': 'acct1', id: 'l1' }, outputJson: true, toJsonOutput, fail });
    await expect(handleLists({ cf, action: 'bogus', opts: { 'account-id': 'acct1' }, outputJson: false, toJsonOutput, fail })).rejects.toThrow('Unknown lists action: bogus');
    await expect(handleLists({ cf, action: 'list', opts: {}, outputJson: false, toJsonOutput, fail })).rejects.toThrow('Missing --account-id or CLOUDFLARE_ACCOUNT_ID');
  });

  test('handleListItems list/create/delete/unknown and validations', async () => {
    async function* iterator() { yield { id: 'i1' }; }
    const cf = { rules: { lists: { items: { list: jest.fn().mockReturnValue(iterator()), create: jest.fn().mockResolvedValue({ ok: true }), delete: jest.fn().mockResolvedValue({ deleted: true }) } } } };
    await handleListItems({ cf, action: 'list', opts: { 'account-id': 'acct1', id: 'list1' }, outputJson: false, toJsonOutput, fail });
    await handleListItems({ cf, action: 'create', opts: { 'account-id': 'acct1', id: 'list1' }, body: { ip: '1.2.3.4' }, outputJson: true, toJsonOutput, fail });
    await handleListItems({ cf, action: 'delete', opts: { 'account-id': 'acct1', id: 'list1', force: true }, body: { ids: ['a', 'b'] }, outputJson: false, toJsonOutput, fail });
    await expect(handleListItems({ cf, action: 'bogus', opts: { 'account-id': 'acct1', id: 'list1' }, outputJson: false, toJsonOutput, fail })).rejects.toThrow('Unknown list-items action: bogus');
    await expect(handleListItems({ cf, action: 'delete', opts: { 'account-id': 'acct1', id: 'list1' }, body: { ids: ['a'] }, outputJson: false, toJsonOutput, fail })).rejects.toThrow('Refusing to delete without --force');
    expect(console.log).toHaveBeenCalledWith(JSON.stringify({ id: 'i1' }));
    expect(cf.rules.lists.items.create).toHaveBeenCalledWith('list1', { account_id: 'acct1', body: [{ ip: '1.2.3.4' }] });
    expect(cf.rules.lists.items.delete).toHaveBeenCalledWith('list1', { account_id: 'acct1', items: [{ id: 'a' }, { id: 'b' }] });
  });
});
