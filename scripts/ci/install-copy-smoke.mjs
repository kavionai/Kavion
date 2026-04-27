import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const probeRoot = path.join(repoRoot, '.tmp', 'install-probe');

async function copyDir(source, target) {
  await fs.mkdir(target, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === '.tmp' || entry.name === '.kavion') continue;
    if (entry.name === 'node_modules' && source === path.join(repoRoot, 'mcp-server')) continue;
    const srcPath = path.join(source, entry.name);
    const dstPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, dstPath);
    } else if (entry.isSymbolicLink()) {
      const linkTarget = await fs.readlink(srcPath);
      await fs.symlink(linkTarget, dstPath);
    } else {
      await fs.copyFile(srcPath, dstPath);
    }
  }
}

async function main() {
  await fs.rm(probeRoot, { recursive: true, force: true });
  await copyDir(repoRoot, probeRoot);

  const child = spawn(process.execPath, [path.join(probeRoot, 'mcp-server', 'launch.js')], {
    cwd: probeRoot,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      KAVION_WORKSPACE_PATH: path.join(probeRoot, 'workspace'),
    },
  });

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve();
    }, 800);

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on('exit', (code, signal) => {
      clearTimeout(timer);
      if (signal === 'SIGTERM' || code === 0) {
        resolve();
        return;
      }
      reject(new Error(`launch.js exited with code ${code ?? 'null'} signal ${signal ?? 'none'}`));
    });
  });

  if (stderr.trim()) {
    throw new Error(`launch.js wrote to stderr during startup:\n${stderr}`);
  }

  console.log(JSON.stringify({ ok: true, probeRoot }, null, 2));
}

await main();
