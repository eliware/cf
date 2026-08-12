import { jest } from '@jest/globals';

describe('cf run()', () => {
  test('dispatches to injected handlers and loads env', async () => {
    const log = jest.fn();
    const error = jest.fn();
    const cfFactory = jest.fn(() => ({ zones: { list: jest.fn().mockResolvedValue({ result: [] }) } }));
    const loadEnv = jest.fn();
    const zones = jest.fn().mockResolvedValue(undefined);

    const mod = await import(`../bin/cf.mjs?ts=${Date.now()}`);
    await mod.run({
      argv: ['zones', 'list', '--json', '--data', '{}'],
      cfFactory,
      loadEnv,
      printer: { log, error },
      fsImpl: { readFileSync: jest.fn(() => '{}') },
      handlers: { zones },
      projectRoot: '/tmp/project',
      exit: jest.fn(),
    });

    expect(loadEnv).toHaveBeenCalledWith('/tmp/project', process.env, expect.any(Object));
    expect(cfFactory).toHaveBeenCalled();
    expect(zones).toHaveBeenCalled();
  });

  test('prints help with no args and unknown resource', async () => {
    const log = jest.fn();
    const error = jest.fn();
    const mod = await import(`../bin/cf.mjs?ts=${Date.now() + 1}`);
    await mod.run({ argv: [], printer: { log, error }, fsImpl: { readFileSync: jest.fn(() => '') }, exit: jest.fn() });
    await mod.run({ argv: ['nope', 'list'], printer: { log, error }, fsImpl: { readFileSync: jest.fn(() => '') }, cfFactory: jest.fn(), loadEnv: jest.fn(), exit: jest.fn() });
    expect(error).not.toHaveBeenCalled();
  });
});

test('CLI loads file bodies and supports injected output/failure dependencies', async () => {
  const mod = await import(`../src/cli.mjs?ts=${Date.now()}`);
  const printer = { log: jest.fn(), error: jest.fn() };
  const loadEnv = jest.fn();
  const cfFactory = jest.fn(() => ({}));
  const handler = jest.fn(({ body, outputJson, printer: injected }) => {
    injected.log(body, outputJson);
  });
  await mod.run({
    argv: ['zones', 'create', '--file', '/tmp/body.json', '--output', 'json'],
    env: {}, projectRoot: '/tmp', loadEnv, cfFactory, printer,
    fsImpl: { readFileSync: jest.fn(() => '{"name":"example.com"}') },
    handlers: { zones: handler }, exit: jest.fn(),
  });
  expect(handler).toHaveBeenCalled();
  expect(printer.log).toHaveBeenCalledWith({ name: 'example.com' }, true);
});

test('CLI reports unknown resources through injected dependencies', async () => {
  const mod = await import(`../src/cli.mjs?ts=${Date.now() + 2}`);
  const printer = { log: jest.fn(), error: jest.fn() };
  const exit = jest.fn();
  await mod.run({ argv: ['unknown', 'list'], printer, exit, loadEnv: jest.fn(), cfFactory: jest.fn() });
  expect(printer.log).toHaveBeenCalled();
  expect(exit).toHaveBeenCalledWith(1);
});

test('CLI exercises JSON output callback', async () => {
  const mod = await import(`../src/cli.mjs?ts=${Date.now() + 3}`);
  const printer = { log: jest.fn(), error: jest.fn() };
  const handler = jest.fn(({ toJsonOutput }) => toJsonOutput({ ok: true }));
  await mod.run({
    argv: ['zones', 'list', '--json'], env: {}, printer,
    loadEnv: jest.fn(), cfFactory: jest.fn(() => ({})),
    handlers: { zones: handler }, exit: jest.fn(),
  });
  expect(printer.log).toHaveBeenCalledWith(JSON.stringify({ ok: true }, null, 2));
});

test('CLI default exit dependency is exercised safely', async () => {
  const mod = await import(`../src/cli.mjs?ts=${Date.now() + 4}`);
  const exit = process.exit;
  process.exit = jest.fn();
  try {
    await mod.run({ argv: ['unknown', 'list'], printer: { log: jest.fn(), error: jest.fn() }, loadEnv: jest.fn(), cfFactory: jest.fn() });
    expect(process.exit).toHaveBeenCalledWith(1);
  } finally {
    process.exit = exit;
  }
});

test('CLI exercises no-body and resource-help paths', async () => {
  const mod = await import(`../src/cli.mjs?ts=${Date.now() + 5}`);
  const printer = { log: jest.fn(), error: jest.fn() };
  const handler = jest.fn(({ body }) => expect(body).toBeNull());
  await mod.run({
    argv: ['zones', 'list'], env: {}, printer, loadEnv: jest.fn(),
    cfFactory: jest.fn(() => ({})), handlers: { zones: handler }, exit: jest.fn(),
  });
  await mod.run({ argv: ['zones'], printer });
  expect(printer.log).toHaveBeenCalled();
});

test('CLI exercises injected failure callback', async () => {
  const mod = await import(`../src/cli.mjs?ts=${Date.now() + 6}`);
  const printer = { log: jest.fn(), error: jest.fn() };
  const exit = jest.fn();
  const handler = jest.fn(({ fail }) => fail('expected failure'));
  await mod.run({
    argv: ['zones', 'list'], env: {}, printer, loadEnv: jest.fn(),
    cfFactory: jest.fn(() => ({})), handlers: { zones: handler }, exit,
  });
  expect(printer.error).toHaveBeenCalledWith('expected failure');
  expect(exit).toHaveBeenCalledWith(1);
});

test('loadBody returns null when no input is provided', async () => {
  const { loadBody } = await import(`../src/cli.mjs?ts=${Date.now() + 7}`);
  expect(loadBody({})).toBeNull();
});

test('CLI normalizes singular aliases before dispatch', async () => {
  const mod = await import(`../src/cli.mjs?ts=${Date.now() + 8}`);
  const handler = jest.fn();
  await mod.run({ argv: ['zone', 'list'], printer: { log: jest.fn(), error: jest.fn() },
    loadEnv: jest.fn(), cfFactory: jest.fn(() => ({})), handlers: { zones: handler }, exit: jest.fn() });
  expect(handler).toHaveBeenCalled();
});

test('CLI applies basic jq selection to JSON callbacks', async () => {
  const mod = await import(`../src/cli.mjs?ts=${Date.now() + 9}`);
  const printer = { log: jest.fn(), error: jest.fn() };
  await mod.run({ argv: ['zones', 'list', '--json', '--jq', '.name'], printer,
    loadEnv: jest.fn(), cfFactory: jest.fn(() => ({})),
    handlers: { zones: ({ toJsonOutput }) => toJsonOutput({ name: 'example.com' }) }, exit: jest.fn() });
  expect(printer.log).toHaveBeenCalledWith('"example.com"');
});

test('CLI quiet mode suppresses normal handler output', async () => {
  const mod = await import(`../src/cli.mjs?ts=${Date.now() + 10}`);
  const printer = { log: jest.fn(), error: jest.fn() };
  await mod.run({ argv: ['zones', 'list', '--quiet'], printer,
    loadEnv: jest.fn(), cfFactory: jest.fn(() => ({})),
    handlers: { zones: ({ printer: injected }) => injected.log('hidden') }, exit: jest.fn() });
  expect(printer.log).not.toHaveBeenCalledWith('hidden');
});

test('CLI accepts terminal output controls without changing JSON contracts', async () => {
  const mod = await import(`../src/cli.mjs?ts=${Date.now() + 11}`);
  const printer = { log: jest.fn(), error: jest.fn() };
  await mod.run({ argv: ['zones', 'list', '--pager=true', '--color=never', '--width', '80'], printer,
    loadEnv: jest.fn(), cfFactory: jest.fn(() => ({})),
    handlers: { zones: ({ printer: injected }) => injected.log('ID\nexample') }, exit: jest.fn() });
  expect(printer.error).not.toHaveBeenCalled();
});

test('CLI manages aliases and config through the command surface', async () => {
  const mod = await import(`../src/cli.mjs?ts=${Date.now() + 12}`);
  const home = `/tmp/cf-cli-settings-${Date.now()}`;
  const files = new Map();
  const fsImpl = {
    existsSync: path => files.has(path),
    readFileSync: path => files.get(path),
    mkdirSync: jest.fn(), writeFileSync: (path, value) => files.set(path, value), chmodSync: jest.fn(),
  };
  const printer = { log: jest.fn(), error: jest.fn() };
  const common = { homeDir: home, fsImpl, printer };
  await mod.run({ ...common, argv: ['alias', 'set', 'work', 'zone', 'list'] });
  await mod.run({ ...common, argv: ['work'], loadEnv: jest.fn(), cfFactory: jest.fn(() => ({})), handlers: { zones: jest.fn() }, exit: jest.fn() });
  await mod.run({ ...common, argv: ['alias', 'list'] });
  await mod.run({ ...common, argv: ['alias', 'list', '--json'] });
  await mod.run({ ...common, argv: ['alias', 'delete', 'work'] });
  await mod.run({ ...common, argv: ['alias', 'delete', 'missing'] });
  await mod.run({ ...common, argv: ['alias', 'delete'] });
  await mod.run({ ...common, argv: ['alias', 'set', 'missing'] });
  await mod.run({ ...common, argv: ['alias', 'unknown'] });
  await mod.run({ ...common, argv: ['alias', 'set', 'raw', 'unknown', 'list'] });
  await mod.run({ ...common, argv: ['raw'], loadEnv: jest.fn(), cfFactory: jest.fn(() => ({})), exit: jest.fn() });
  await mod.run({ ...common, argv: ['config', 'set', 'pager', 'less'] });
  await mod.run({ ...common, argv: ['config', 'get', 'pager'] });
  await mod.run({ ...common, argv: ['config', 'list', '--json'] });
  await mod.run({ ...common, argv: ['config', 'list'] });
  await mod.run({ ...common, argv: ['config', 'get', 'missing'] });
  await mod.run({ ...common, argv: ['config', 'set', 'missing'] });
  await mod.run({ ...common, argv: ['config', 'unset', 'pager'] });
  await mod.run({ ...common, argv: ['config', 'unknown'] });
  expect(printer.error).toHaveBeenCalledWith('Usage: cf config set <name> <value>');
});

test('CLI supports a bare pager flag with and without saved pager settings', async () => {
  const mod = await import(`../src/cli.mjs?ts=${Date.now() + 17}`);
  const home = `/tmp/cf-cli-pager-${Date.now()}`; const printer = { log: jest.fn(), error: jest.fn() };
  const fsImpl = { existsSync: () => false, readFileSync: jest.fn(), mkdirSync: jest.fn(), writeFileSync: jest.fn(), chmodSync: jest.fn() };
  const handler = ({ printer: injected }) => injected.log('pager output');
  const oldPager = process.env.PAGER; process.env.PAGER = 'true';
  try { await mod.run({ argv: ['zones', 'list', '--pager'], env: {}, homeDir: home, fsImpl, printer, loadEnv: jest.fn(), cfFactory: jest.fn(() => ({})), handlers: { zones: handler }, exit: jest.fn() }); } finally { process.env.PAGER = oldPager; }
  const savedPager = process.env.PAGER; delete process.env.PAGER;
  try { await mod.run({ argv: ['zones', 'list', '--pager', '--no-pager'], env: {}, homeDir: `${home}-fallback`, fsImpl, printer, loadEnv: jest.fn(), cfFactory: jest.fn(() => ({})), handlers: { zones: handler }, exit: jest.fn() }); } finally { process.env.PAGER = savedPager; }
  expect(printer.error).not.toHaveBeenCalled();
});

test('CLI prints dashboard links before dispatch', async () => {
  const mod = await import(`../src/cli.mjs?ts=${Date.now() + 13}`);
  const printer = { log: jest.fn(), error: jest.fn() };
  await mod.run({ argv: ['zone', 'get', '--zone-id', 'z1', '--web'], printer, exit: jest.fn() });
  expect(printer.log).toHaveBeenCalledWith('https://dash.cloudflare.com/zones/z1');
  await mod.run({ argv: ['zone', 'get', '--account-id', 'a1', '--web'], printer, exit: jest.fn() });
  await mod.run({ argv: ['zone', 'get', '--web'], printer, exit: jest.fn() });
});

test('CLI renders templates through injected handlers', async () => {
  const mod = await import(`../src/cli.mjs?ts=${Date.now() + 14}`);
  const printer = { log: jest.fn(), error: jest.fn() };
  await mod.run({ argv: ['zones', 'list', '--template', '{{.name}}'], printer, loadEnv: jest.fn(), cfFactory: jest.fn(() => ({})), handlers: { zones: ({ toJsonOutput }) => toJsonOutput({ name: 'example.com' }) }, exit: jest.fn() });
  expect(printer.log).toHaveBeenCalledWith('example.com');
});

test('CLI loads an installed extension without Cloudflare credentials', async () => {
  const mod = await import(`../src/cli.mjs?ts=${Date.now() + 15}`);
  const { fs } = await import('@eliware/common'); const os = await import('node:os'); const path = await import('node:path');
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-cli-ext-')); const root = path.join(home, '.config/cf/extensions/hello'); fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, 'cf-extension.json'), JSON.stringify({ name: 'hello', version: '1.0.0', commands: { hello: 'hello.mjs' } }));
  fs.writeFileSync(path.join(root, 'hello.mjs'), 'export default ({ printer, opts }) => printer.log(`Hello ${opts.name}`)');
  const printer = { log: jest.fn(), error: jest.fn() };
  await mod.run({ argv: ['hello', '--name', 'Eli'], printer, fsImpl: fs, homeDir: home });
  expect(printer.log).toHaveBeenCalledWith('Hello Eli');
});

test('CLI reports an installed extension with no runnable handler', async () => {
  const mod = await import(`../src/cli.mjs?ts=${Date.now() + 16}`);
  const { fs } = await import('@eliware/common'); const os = await import('node:os'); const path = await import('node:path');
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-cli-empty-ext-')); const root = path.join(home, '.config/cf/extensions/empty'); fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, 'cf-extension.json'), JSON.stringify({ name: 'empty', version: '1.0.0', commands: { empty: 'empty.mjs' } })); fs.writeFileSync(path.join(root, 'empty.mjs'), 'export const value = 1');
  const printer = { log: jest.fn(), error: jest.fn() }; await mod.run({ argv: ['empty', 'run'], printer, fsImpl: fs, homeDir: home });
  expect(printer.error).toHaveBeenCalledWith('Extension command is not loadable: empty');
});

test('CLI passes output and failure helpers to extensions', async () => {
  const mod = await import(`../src/cli.mjs?ts=${Date.now() + 17}`);
  const { fs } = await import('@eliware/common'); const os = await import('node:os'); const path = await import('node:path');
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-cli-helper-ext-')); const root = path.join(home, '.config/cf/extensions/helper'); fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, 'cf-extension.json'), JSON.stringify({ name: 'helper', version: '1.0.0', commands: { helper: 'helper.mjs' } }));
  fs.writeFileSync(path.join(root, 'helper.mjs'), 'export default ({ toJsonOutput, fail, opts }) => opts.fail ? fail("extension failure") : toJsonOutput({ ok: true })');
  const printer = { log: jest.fn(), error: jest.fn() };
  await mod.run({ argv: ['helper', '--output', 'json'], printer, fsImpl: fs, homeDir: home });
  await mod.run({ argv: ['helper', '--fail'], printer, fsImpl: fs, homeDir: home });
  expect(printer.log).toHaveBeenCalledWith('{\n  "ok": true\n}');
  expect(printer.error).toHaveBeenCalledWith('extension failure');
});

test('CLI manages extensions without Cloudflare credentials', async () => {
  const mod = await import(`../src/cli.mjs?ts=${Date.now() + 18}`);
  const { fs } = await import('@eliware/common'); const os = await import('node:os'); const path = await import('node:path');
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-cli-extension-command-')); const printer = { log: jest.fn(), error: jest.fn() };
  await mod.run({ argv: ['extension', 'list'], printer, fsImpl: fs, homeDir: home });
  expect(printer.log).toHaveBeenCalledWith(expect.stringContaining('NAME'));
});

test('CLI routes the extension resource through its built-in handler', async () => {
  const mod = await import(`../src/cli.mjs?ts=${Date.now() + 19}`);
  const { fs } = await import('@eliware/common'); const os = await import('node:os'); const path = await import('node:path');
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-cli-extension-dispatch-')); const printer = { log: jest.fn(), error: jest.fn() };
  await mod.run({ argv: ['extension', 'list', '--json'], printer, fsImpl: fs, homeDir: home });
  await mod.run({ argv: ['extension', 'install'], printer, fsImpl: fs, homeDir: home });
  expect(printer.log).toHaveBeenCalledWith('[]');
  expect(printer.error).toHaveBeenCalledWith('Missing --path to an extension directory');
});

test('CLI dispatches built-in load-balancer and tunnel handlers', async () => {
  const mod = await import(`../src/cli.mjs?ts=${Date.now() + 11}`);
  const printer = { log: jest.fn(), error: jest.fn() };
  const cfFactory = jest.fn(() => ({ get: jest.fn().mockResolvedValue({ ok: true }) }));
  const common = { printer, loadEnv: jest.fn(), cfFactory, env: {}, exit: jest.fn() };
  await mod.run({ ...common, argv: ['load-balancer', 'list', '--zone-id', 'z1'] });
  await mod.run({ ...common, argv: ['tunnel', 'list', '--account-id', 'a1'] });
  expect(printer.log).toHaveBeenCalled();
});

test('CLI dispatches account platform handlers', async () => {
  const mod = await import(`../src/cli.mjs?ts=${Date.now() + 12}`);
  const printer = { log: jest.fn(), error: jest.fn() };
  const cfFactory = jest.fn(() => ({ get: jest.fn().mockResolvedValue({ ok: true }) }));
  for (const resource of ['workers', 'pages', 'r2', 'd1', 'queues', 'stream', 'images', 'ai', 'access']) {
    await mod.run({ argv: [resource, 'list', '--account-id', 'a1'], printer, loadEnv: jest.fn(), cfFactory, env: {}, exit: jest.fn() });
  }
  expect(printer.log).toHaveBeenCalled();
});
