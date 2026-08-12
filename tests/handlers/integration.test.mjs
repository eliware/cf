import { jest } from '@jest/globals';
import { handleZones } from '../../src/handlers/zones.mjs';
import { handleZoneSettings } from '../../src/handlers/zone-settings.mjs';
import { handleDnsRecords } from '../../src/handlers/dns-records.mjs';
import { handleRulesets } from '../../src/handlers/rulesets.mjs';
import { handleLists } from '../../src/handlers/lists.mjs';
import { handleListItems } from '../../src/handlers/list-items.mjs';

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
    expect(console.log).toHaveBeenCalledWith('ID  NAME\n--  ----\nz1  example.com');
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
    expect(console.log).toHaveBeenCalledWith('ID  TYPE  NAME  CONTENT\n--  ----  ----  -------\nr1  A     www   1.2.3.4');
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
    expect(console.log).toHaveBeenCalledWith('ID  VALUE\n--  -----\ni1  {"id":"i1"}');
    expect(cf.rules.lists.items.create).toHaveBeenCalledWith('list1', { account_id: 'acct1', body: [{ ip: '1.2.3.4' }] });
    expect(cf.rules.lists.items.delete).toHaveBeenCalledWith('list1', { account_id: 'acct1', items: [{ id: 'a' }, { id: 'b' }] });
  });
});

test('covers mutating dry-run and real branches', async () => {
  const printer = { log: jest.fn(), error: jest.fn() };
  const fail = jest.fn(msg => { throw new Error(msg); });
  const out = jest.fn();
  const common = { outputJson: false, printer, toJsonOutput: out, fail };
  await handleDnsRecords({ ...common, cf: { dns: { records: { create: jest.fn(), update: jest.fn().mockResolvedValue({ ok: 1 }) } } }, action: 'create', opts: { 'zone-id': 'z', 'dry-run': true }, body: { type: 'A' } });
  await handleDnsRecords({ ...common, cf: { dns: { records: { create: jest.fn().mockResolvedValue({ ok: 1 }), update: jest.fn() } } }, action: 'create', opts: { 'zone-id': 'z' }, body: { type: 'A' } });
  await handleDnsRecords({ ...common, cf: { dns: { records: { create: jest.fn(), update: jest.fn().mockResolvedValue({ ok: 1 }) } } }, action: 'update', opts: { 'zone-id': 'z', id: 'r', 'dry-run': true }, body: { content: 'x' } });
  await handleDnsRecords({ ...common, cf: { dns: { records: { create: jest.fn(), update: jest.fn().mockResolvedValue({ ok: 1 }) } } }, action: 'update', opts: { 'zone-id': 'z', id: 'r' }, body: { content: 'x' } });

  async function* items() { yield { id: 'i' }; }
  await handleListItems({ ...common, cf: { rules: { lists: { items: { list: jest.fn().mockReturnValue(items()), create: jest.fn(), delete: jest.fn() } } } }, action: 'create', opts: { 'account-id': 'a', id: 'l', 'dry-run': true }, body: { ip: '1.1.1.1' } });
  await handleListItems({ ...common, cf: { rules: { lists: { items: { list: jest.fn(), create: jest.fn().mockResolvedValue({ ok: 1 }), delete: jest.fn() } } } }, action: 'create', opts: { 'account-id': 'a', id: 'l' }, body: [{ ip: '1.1.1.1' }] });
  await handleListItems({ ...common, cf: { rules: { lists: { items: { list: jest.fn(), create: jest.fn(), delete: jest.fn().mockResolvedValue({ ok: 1 }) } } } }, action: 'delete', opts: { 'account-id': 'a', id: 'l', force: true }, body: { ids: ['i'] } });

  await handleRulesets({ ...common, cf: { rulesets: { create: jest.fn(), update: jest.fn().mockResolvedValue({ ok: 1 }) } }, action: 'create', opts: { 'zone-id': 'z', 'dry-run': true }, body: { name: 'x' } });
  await handleZoneSettings({ ...common, cf: { zones: { settings: { get: jest.fn(), edit: jest.fn().mockResolvedValue({ ok: 1 }) } } }, action: 'set', opts: { 'zone-id': 'z', setting: 'dev' }, body: { value: 'on' } });
  await handleZones({ ...common, cf: { zones: { create: jest.fn(), edit: jest.fn().mockResolvedValue({ ok: 1 }) } }, action: 'update', opts: { 'zone-id': 'z' }, body: { name: 'x' } });
});

test('handleLists covers text get and JSON list output', async () => {
  const printer = { log: jest.fn() };
  const toJsonOutput = jest.fn();
  const fail = jest.fn(msg => { throw new Error(msg); });
  async function* iterator() { yield { id: 'l2', name: 'list2' }; }
  const cf = { rules: { lists: { list: jest.fn().mockReturnValue(iterator()), get: jest.fn().mockResolvedValue({ id: 'l2' }) } } };
  await handleLists({ cf, action: 'list', opts: { 'account-id': 'a' }, outputJson: true, printer, toJsonOutput, fail });
  await handleLists({ cf, action: 'get', opts: { 'account-id': 'a', id: 'l2' }, outputJson: false, printer, toJsonOutput, fail });
  expect(toJsonOutput).toHaveBeenCalledWith([{ id: 'l2', name: 'list2' }]);
  expect(printer.log).toHaveBeenCalled();
});

test('handleListItems covers JSON list/delete and invalid delete body', async () => {
  const printer = { log: jest.fn() };
  const toJsonOutput = jest.fn();
  const fail = jest.fn(msg => { throw new Error(msg); });
  async function* iterator() { yield { id: 'i2' }; }
  const cf = { rules: { lists: { items: {
    list: jest.fn().mockReturnValue(iterator()),
    delete: jest.fn().mockResolvedValue({ deleted: true }),
  } } } };
  await handleListItems({ cf, action: 'list', opts: { 'account-id': 'a', id: 'l' }, outputJson: true, printer, toJsonOutput, fail });
  await handleListItems({ cf, action: 'delete', opts: { 'account-id': 'a', id: 'l', force: true }, body: { ids: ['i2'] }, outputJson: true, printer, toJsonOutput, fail });
  await expect(handleListItems({ cf, action: 'delete', opts: { 'account-id': 'a', id: 'l' }, body: {}, outputJson: false, printer, toJsonOutput, fail })).rejects.toThrow('Missing --data');
  expect(toJsonOutput).toHaveBeenCalledTimes(2);
});

test('handleZoneSettings covers API variants, dry-run, and text output', async () => {
  const printer = { log: jest.fn() };
  const toJsonOutput = jest.fn();
  const fail = jest.fn(msg => { throw new Error(msg); });
  const modern = { zones: { settings: { get: jest.fn().mockResolvedValue({ value: 'on' }), edit: jest.fn().mockResolvedValue({ value: 'off' }) } } };
  await handleZoneSettings({ cf: modern, action: 'get', opts: { 'zone-id': 'z', setting: 'dev' }, outputJson: false, printer, toJsonOutput, fail });
  await handleZoneSettings({ cf: modern, action: 'get', opts: { 'zone-id': 'z', setting: 'dev' }, outputJson: true, printer, toJsonOutput, fail });
  await handleZoneSettings({ cf: modern, action: 'set', opts: { 'zone-id': 'z', setting: 'dev', 'dry-run': true }, body: { value: 'on' }, outputJson: false, printer, toJsonOutput, fail });
  await handleZoneSettings({ cf: modern, action: 'set', opts: { 'zone-id': 'z', setting: 'dev' }, body: { value: 'off' }, outputJson: false, printer, toJsonOutput, fail });
  const legacyGet = function legacyGet(setting, options) { return Promise.resolve({ value: setting, zone: options.zone_id }); };
  const legacy = { zones: { settings: { get: legacyGet, update: jest.fn().mockResolvedValue({ value: 'off' }) } } };
  await handleZoneSettings({ cf: legacy, action: 'get', opts: { 'zone-id': 'z', setting: 'dev' }, outputJson: false, printer, toJsonOutput, fail });
  await handleZoneSettings({ cf: legacy, action: 'set', opts: { 'zone-id': 'z', setting: 'dev' }, body: { value: 'off' }, outputJson: true, printer, toJsonOutput, fail });
  expect(toJsonOutput).toHaveBeenCalled();
});

test('handleZones covers text mutation and dry-run branches', async () => {
  const printer = { log: jest.fn() };
  const toJsonOutput = jest.fn();
  const fail = jest.fn(msg => { throw new Error(msg); });
  const cf = { zones: {
    get: jest.fn().mockResolvedValue({ id: 'z' }),
    create: jest.fn().mockResolvedValue({ created: true }),
    edit: jest.fn().mockResolvedValue({ updated: true }),
    delete: jest.fn().mockResolvedValue({ deleted: true }),
  } };
  await handleZones({ cf, action: 'get', opts: { 'zone-id': 'z' }, outputJson: false, printer, toJsonOutput, fail });
  await handleZones({ cf, action: 'create', opts: { 'dry-run': true }, body: { name: 'x' }, outputJson: false, printer, toJsonOutput, fail });
  await handleZones({ cf, action: 'create', opts: {}, body: { name: 'x' }, outputJson: false, printer, toJsonOutput, fail });
  await handleZones({ cf, action: 'update', opts: { 'zone-id': 'z', 'dry-run': true }, body: { name: 'x' }, outputJson: false, printer, toJsonOutput, fail });
  await handleZones({ cf, action: 'update', opts: { 'zone-id': 'z' }, body: { name: 'x' }, outputJson: false, printer, toJsonOutput, fail });
  await handleZones({ cf, action: 'delete', opts: { 'zone-id': 'z', force: true }, outputJson: false, printer, toJsonOutput, fail });
  expect(printer.log).toHaveBeenCalled();
});

test('handleZones update supports JSON output', async () => {
  const toJsonOutput = jest.fn();
  const cf = { zones: { edit: jest.fn().mockResolvedValue({ updated: true }) } };
  await handleZones({ cf, action: 'update', opts: { 'zone-id': 'z' }, body: { name: 'x' }, outputJson: true, printer: { log: jest.fn() }, toJsonOutput, fail: jest.fn() });
  expect(toJsonOutput).toHaveBeenCalledWith({ updated: true });
});

test('handleDnsRecords covers raw-list and text mutation branches', async () => {
  const printer = { log: jest.fn() };
  const toJsonOutput = jest.fn();
  const fail = jest.fn(msg => { throw new Error(msg); });
  const cf = { dns: { records: {
    list: jest.fn().mockResolvedValue([{ id: 'r', type: 'A', name: 'x', content: '1.2.3.4' }]),
    get: jest.fn().mockResolvedValue({ id: 'r' }),
    create: jest.fn().mockResolvedValue({ created: true }),
    delete: jest.fn().mockResolvedValue({ deleted: true }),
  } } };
  await handleDnsRecords({ cf, action: 'list', opts: { 'zone-id': 'z' }, outputJson: false, printer, toJsonOutput, fail });
  await handleDnsRecords({ cf, action: 'get', opts: { 'zone-id': 'z', id: 'r' }, outputJson: false, printer, toJsonOutput, fail });
  await handleDnsRecords({ cf, action: 'create', opts: { 'zone-id': 'z' }, body: { type: 'A' }, outputJson: false, printer, toJsonOutput, fail });
  await handleDnsRecords({ cf, action: 'delete', opts: { 'zone-id': 'z', id: 'r', force: true }, outputJson: false, printer, toJsonOutput, fail });
  expect(printer.log).toHaveBeenCalled();
});

test('handleDnsRecords covers JSON list/create/delete outputs', async () => {
  const printer = { log: jest.fn() };
  const toJsonOutput = jest.fn();
  const fail = jest.fn(msg => { throw new Error(msg); });
  const cf = { dns: { records: {
    list: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({ created: true }),
    delete: jest.fn().mockResolvedValue({ deleted: true }),
  } } };
  await handleDnsRecords({ cf, action: 'list', opts: { 'zone-id': 'z' }, outputJson: true, printer, toJsonOutput, fail });
  await handleDnsRecords({ cf, action: 'create', opts: { 'zone-id': 'z' }, body: { type: 'A' }, outputJson: true, printer, toJsonOutput, fail });
  await handleDnsRecords({ cf, action: 'delete', opts: { 'zone-id': 'z', id: 'r', force: true }, outputJson: true, printer, toJsonOutput, fail });
  expect(toJsonOutput).toHaveBeenCalledTimes(3);
});

test('handleRulesets covers account scope and text/dry-run branches', async () => {
  const printer = { log: jest.fn() };
  const toJsonOutput = jest.fn();
  const fail = jest.fn(msg => { throw new Error(msg); });
  const cf = { rulesets: {
    list: jest.fn().mockResolvedValue({ listed: true }),
    get: jest.fn().mockResolvedValue({ id: 'r' }),
    create: jest.fn().mockResolvedValue({ created: true }),
    update: jest.fn().mockResolvedValue({ updated: true }),
  } };
  await handleRulesets({ cf, action: 'list', opts: { 'account-id': 'a' }, outputJson: false, printer, toJsonOutput, fail });
  await handleRulesets({ cf, action: 'get', opts: { 'account-id': 'a', id: 'r' }, outputJson: false, printer, toJsonOutput, fail });
  await handleRulesets({ cf, action: 'create', opts: { 'account-id': 'a' }, body: { name: 'x' }, outputJson: true, printer, toJsonOutput, fail });
  await handleRulesets({ cf, action: 'create', opts: { 'account-id': 'a', 'dry-run': true }, body: { name: 'x' }, outputJson: false, printer, toJsonOutput, fail });
  await handleRulesets({ cf, action: 'update', opts: { 'account-id': 'a', id: 'r', 'dry-run': true }, body: { name: 'x' }, outputJson: false, printer, toJsonOutput, fail });
  await handleRulesets({ cf, action: 'update', opts: { 'account-id': 'a', id: 'r' }, body: { name: 'x' }, outputJson: false, printer, toJsonOutput, fail });
  expect(printer.log).toHaveBeenCalled();
  expect(toJsonOutput).toHaveBeenCalledWith({ created: true });
});

test('handleRulesets covers zone get text and real create', async () => {
  const printer = { log: jest.fn() };
  const toJsonOutput = jest.fn();
  const fail = jest.fn(msg => { throw new Error(msg); });
  const cf = { rulesets: {
    get: jest.fn().mockResolvedValue({ id: 'r' }),
    create: jest.fn().mockResolvedValue({ created: true }),
  } };
  await handleRulesets({ cf, action: 'get', opts: { 'zone-id': 'z', id: 'r' }, outputJson: false, printer, toJsonOutput, fail });
  await handleRulesets({ cf, action: 'create', opts: { 'zone-id': 'z' }, body: { name: 'x' }, outputJson: false, printer, toJsonOutput, fail });
  expect(printer.log).toHaveBeenCalled();
});
