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
