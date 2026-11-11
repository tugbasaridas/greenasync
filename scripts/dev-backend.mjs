import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appData = process.platform === 'win32'
  ? join(process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'GreenAsync')
  : join(homedir(), '.greenasync');
const dataDir = join(appData, 'class-demo-v2');

const options = {
  cwd: fileURLToPath(new URL('../', import.meta.url)),
  env: { ...process.env, DATA_DIR: dataDir, UPLOAD_DIR: join(dataDir, 'audio'), DATABASE_URL: '', PORT: '3000' },
  stdio: 'inherit',
};

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, options);
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
}

console.log(`GreenAsync demo verileri: ${dataDir}`);
try {
  const buildCode = await run([process.env.npm_execpath, 'run', 'build', '--workspace', 'backend']);
  process.exitCode = buildCode === 0 ? await run(['backend/dist/main.js']) : buildCode;
} catch (error) {
  console.error('Backend başlatılamadı:', error.message);
  process.exitCode = 1;
}
