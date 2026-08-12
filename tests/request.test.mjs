import { jest } from '@jest/globals';
import { getAllPages, requestWithBackoff, withPage } from '../src/request.mjs';

test('withPage preserves existing query strings', () => {
  expect(withPage('/zones', 2)).toBe('/zones?page=2&per_page=100');
  expect(withPage('/zones?name=x', 2)).toBe('/zones?name=x&page=2&per_page=100');
});

test('getAllPages combines result pages when requested', async () => {
  const fetchPage = jest.fn(async page => ({ result: [{ page }], result_info: { total_pages: 2 } }));
  const first = { result: [{ page: 1 }], result_info: { total_pages: 2, total_count: 2 } };
  expect(await getAllPages(fetchPage, first, { paginate: true })).toEqual({ result: [{ page: 1 }, { page: 2 }], result_info: { total_pages: 2, total_count: 2, page: 1 } });
  expect(fetchPage).toHaveBeenCalledWith(2);
  expect(await getAllPages(fetchPage, first)).toBe(first);
  expect(await getAllPages(fetchPage, { result: [], result_info: { total_pages: 1 } }, { paginate: true })).toEqual({ result: [], result_info: { total_pages: 1 } });
  const scalar = { result: 'value', result_info: { total_pages: 2, total_count: 5 } };
  const scalarPage = await getAllPages(async () => ({ result: 'next' }), scalar, { paginate: true });
  expect(scalarPage.result).toBe('value');
});

test('requestWithBackoff retries rate limits and propagates other errors', async () => {
  expect(await requestWithBackoff(async () => 'default')).toBe('default');
  const defaultDelay = jest.fn().mockRejectedValueOnce({ status: 429 }).mockResolvedValue('ok');
  expect(await requestWithBackoff(defaultDelay)).toBe('ok');
  const request = jest.fn().mockRejectedValueOnce({ status: 429 }).mockResolvedValue('ok');
  expect(await requestWithBackoff(request, { delay: async () => {} })).toBe('ok');
  const error = new Error('bad'); error.status = 500;
  await expect(requestWithBackoff(jest.fn().mockRejectedValue(error), { delay: async () => {} })).rejects.toBe(error);
  const statusCode = jest.fn().mockRejectedValueOnce({ statusCode: 429 }).mockResolvedValue('ok');
  expect(await requestWithBackoff(statusCode, { delay: async () => {} })).toBe('ok');
  const responseStatus = jest.fn().mockRejectedValueOnce({ response: { status: 429 } }).mockResolvedValue('ok');
  expect(await requestWithBackoff(responseStatus, { delay: async () => {} })).toBe('ok');
});
