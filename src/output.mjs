import { log } from '@eliware/common';

export function toJsonOutput(value, printer = log.info.bind(log)) {
  printer(JSON.stringify(value, null, 2));
}

export function selectJson(value, expression) {
  if (!expression || expression === '.') return value;
  const parts = expression.replace(/^\./, '').split('.').filter(Boolean);
  return parts.reduce((current, part) => {
    if (Array.isArray(current)) return current.map(item => item?.[part]);
    if (part.endsWith('[]')) {
      const key = part.slice(0, -2);
      return [current].flat().flatMap(item => item?.[key] || []);
    }
    return current?.[part];
  }, value);
}

export function renderTemplate(value, template) {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, expression) => {
    const selected = selectJson(value, expression.trim().startsWith('.') ? expression.trim() : `.${expression.trim()}`);
    return selected === undefined || selected === null ? '' : String(selected);
  });
}

export function printTextList(items, formatter, printer = log.info.bind(log)) {
  for (const item of items) printer(formatter(item));
}

export function renderTable(headers, rows) {
  const values = [headers, ...rows].map(row => row.map(value => String(value ?? '')));
  const widths = headers.map((_, index) => Math.max(...values.map(row => row[index].length)));
  const format = row => row.map((value, index) => String(value ?? '').padEnd(widths[index])).join('  ').trimEnd();
  return [format(headers), format(headers.map(header => '-'.repeat(header.length))), ...rows.map(format)].join('\n');
}

export function printTable(headers, rows, printer = log.info.bind(log)) {
  printer(renderTable(headers, rows));
}
