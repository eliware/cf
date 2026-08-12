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

export function printTextList(items, formatter, printer = log.info.bind(log)) {
  for (const item of items) printer(formatter(item));
}
