import { jest } from '@jest/globals';

describe('cf_admin run()', () => {
  test('dispatches to injected handlers and loads env', async () => {
    const log = jest.fn();
    const error = jest.fn();
    const cfFactory = jest.fn(() => ({ zones: { list: jest.fn().mockResolvedValue({ result: [] }) } }));
    const loadEnv = jest.fn();
    const zones = jest.fn().mockResolvedValue(undefined);

    const mod = await import(`../bin/cf_admin.mjs?ts=${Date.now()}`);
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
    const mod = await import(`../bin/cf_admin.mjs?ts=${Date.now() + 1}`);
    await mod.run({ argv: [], printer: { log, error }, fsImpl: { readFileSync: jest.fn(() => '') }, exit: jest.fn() });
    await mod.run({ argv: ['nope', 'list'], printer: { log, error }, fsImpl: { readFileSync: jest.fn(() => '') }, cfFactory: jest.fn(), loadEnv: jest.fn(), exit: jest.fn() });
    expect(error).not.toHaveBeenCalled();
  });
});
