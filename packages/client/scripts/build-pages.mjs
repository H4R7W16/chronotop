import { copyFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientRoot = path.resolve(__dirname, '..');
const env = {
  ...process.env,
  VITE_STATIC_DEMO: 'true',
  VITE_BASE_PATH: process.env.VITE_BASE_PATH || '/',
};

function run(command, args) {
  const windows = process.platform === 'win32';
  const executable = windows ? 'cmd.exe' : command;
  const finalArgs = windows
    ? ['/d', '/s', '/c', [command, ...args].map(quoteArg).join(' ')]
    : args;
  const result = spawnSync(executable, finalArgs, {
    cwd: clientRoot,
    env,
    stdio: 'inherit',
  });
  if (result.error) {
    console.error(result.error);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function quoteArg(value) {
  if (!/[\s"&|<>^]/.test(value)) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
}

run('npx', ['tsc', '-b']);
run('npx', ['vite', 'build']);

const dist = path.join(clientRoot, 'dist');
copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'));
writeFileSync(path.join(dist, '.nojekyll'), '');

console.log(`Static GitHub Pages build completed with base ${env.VITE_BASE_PATH}`);
