import { spawn } from 'node:child_process';
import { copyFile, stat } from 'node:fs/promises';

const watch = process.argv.includes('--watch');
const args = ['esbuild', 'src/main.js', '--outfile=game.bundle.js', '--format=iife', '--bundle', '--minify', '--target=es2020'];
if (watch) args.push('--watch');

async function report() {
  await copyFile('src/styles.css', 'styles.css');
  const { size } = await stat('game.bundle.js');
  console.log(`game.bundle.js: ${size} bytes`);
  if (size > 300 * 1024) console.warn('Warning: game.bundle.js exceeds 300KB');
}

const child = spawn('npx', args, { stdio: 'inherit' });
child.on('exit', async (code) => {
  if (code === 0) await report();
  process.exitCode = code ?? 1;
});
