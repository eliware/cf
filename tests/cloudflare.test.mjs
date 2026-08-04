import { jest } from '@jest/globals';
import { createCloudflareClient } from '../src/cloudflare.mjs';

describe('cloudflare helper', () => {
  test('createCloudflareClient supports dependency injection', () => {
    const ctor = jest.fn().mockImplementation(cfg => ({ cfg }));
    const client = createCloudflareClient({ CloudflareClass: ctor, env: { CLOUDFLARE_EMAIL: 'a@b.com', CLOUDFLARE_API_KEY: 'k' } });
    expect(ctor).toHaveBeenCalledWith({ apiEmail: 'a@b.com', apiKey: 'k' });
    expect(client.cfg.apiEmail).toBe('a@b.com');
  });

  test('createCloudflareClient throws without credentials', () => {
    expect(() => createCloudflareClient({ env: {} })).toThrow('Missing CLOUDFLARE_EMAIL or CLOUDFLARE_API_KEY');
  });
});

test('createCloudflareClient handles omitted options safely', () => {
  expect(() => createCloudflareClient()).toThrow('Missing CLOUDFLARE_EMAIL or CLOUDFLARE_API_KEY');
});
