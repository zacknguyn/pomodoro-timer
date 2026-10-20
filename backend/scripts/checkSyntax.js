import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
for (const file of ['index.js', ...['src', 'scripts', 'test'].flatMap(directory => readdirSync(directory, { recursive: true }).filter(file => file.endsWith('.js')).map(file => `${directory}/${file}`))]) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}
