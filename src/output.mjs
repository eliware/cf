export function toJsonOutput(value, printer = console.log) {
  printer(JSON.stringify(value, null, 2));
}

export function printTextList(items, formatter, printer = console.log) {
  for (const item of items) printer(formatter(item));
}
