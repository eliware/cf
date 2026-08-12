export function withPage(path, page) {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}page=${page}&per_page=100`;
}

export async function requestWithBackoff(request, { retries = 3, delay = () => new Promise(resolve => setTimeout(resolve, 100)) } = {}) {
  for (let attempt = 0; ; attempt++) {
    try { return await request(); } catch (error) {
      const status = error?.status || error?.statusCode || error?.response?.status;
      if (status !== 429 || attempt >= retries) throw error;
      await delay(attempt);
    }
  }
}

export async function getAllPages(fetchPage, first, { paginate = false } = {}) {
  if (!paginate || !first?.result_info?.total_pages || first.result_info.total_pages <= 1) return first;
  const pages = Array.isArray(first.result) ? [...first.result] : first.result;
  for (let page = 2; page <= first.result_info.total_pages; page++) {
    const next = await fetchPage(page);
    if (Array.isArray(pages) && Array.isArray(next?.result)) pages.push(...next.result);
  }
  return { ...first, result: pages, result_info: { ...first.result_info, page: 1, total_count: Array.isArray(pages) ? pages.length : first.result_info.total_count } };
}
