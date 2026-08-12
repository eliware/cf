import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';
const command = isWindows ? process.env.ComSpec || 'cmd.exe' : 'npm';
const args = isWindows ? ['/d', '/s', '/c', 'npm test -- --runInBand'] : ['test', '--', '--runInBand'];
const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
let stdout = '';
let stderr = '';
child.stdout.on('data', chunk => { stdout += chunk.toString(); });
child.stderr.on('data', chunk => { stderr += chunk.toString(); });

child.once('close', code => {
  if (code !== 0) {
    process.stdout.write(stdout);
    process.stderr.write(stderr);
    process.exitCode = code ?? 1;
    return;
  }

  const coverageRows = stdout.split('\n').filter(line => /\|\s*\d+(?:\.\d+)?\s*\|\s*\d+(?:\.\d+)?\s*\|\s*\d+(?:\.\d+)?\s*\|\s*\d+(?:\.\d+)?\s*\|/.test(line));
  const gaps = coverageRows.filter(line => {
    const values = [...line.matchAll(/\|\s*(\d+(?:\.\d+)?)\s*/g)].slice(0, 4).map(match => Number(match[1]));
    return values.length === 4 && values.some(value => value < 100);
  });
  if (gaps.length > 0) {
    process.stderr.write(`Coverage gaps detected:\n${gaps.join('\n')}\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write('No gaps found\n');
});
