import { parseArgs, tokenizeCommand } from '../src/args.mjs';

describe('parseArgs', () => {
  test('splits positional args from flags', () => {
    expect(parseArgs(['zones', 'list', '--json'])).toEqual({
      args: ['zones', 'list'],
      opts: { json: true },
    });
  });

  test('supports --key=value syntax', () => {
    expect(parseArgs(['dns-records', 'get', '--zone-id=abc123', '--id', 'rec1'])).toEqual({
      args: ['dns-records', 'get'],
      opts: { 'zone-id': 'abc123', id: 'rec1' },
    });
  });

  test('captures flag values and bare flags', () => {
    expect(parseArgs(['list-items', 'create', '--account-id', 'acct1', '--force'])).toEqual({
      args: ['list-items', 'create'],
      opts: { 'account-id': 'acct1', force: true },
    });
  });
});

test('tokenizeCommand preserves quoted alias arguments and rejects incomplete quotes', () => {
  expect(tokenizeCommand('dns list --name "example.com" --comment \'hello world\'')).toEqual(['dns', 'list', '--name', 'example.com', '--comment', 'hello world']);
  expect(() => tokenizeCommand('dns list --name "example.com')).toThrow('Unterminated quote');
});

test('tokenizeCommand handles escapes, whitespace, and trailing escapes', () => {
  expect(tokenizeCommand('api --data "hello\\ world" --name a\\ b')).toEqual(['api', '--data', 'hello world', '--name', 'a b']);
  expect(tokenizeCommand('value\\')).toEqual(['value\\']);
  expect(tokenizeCommand('  one\t two  ')).toEqual(['one', 'two']);
});
