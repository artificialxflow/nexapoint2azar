import { spawn } from 'node:child_process';

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
    });
  });
}

const migrateOnly = process.env.MIGRATE_ONLY === 'true' || process.env.MIGRATE_ONLY === '1';
const skipMigrate = process.env.SKIP_MIGRATE === 'true' || process.env.SKIP_MIGRATE === '1';
const skipBootstrap =
  process.env.SKIP_BOOTSTRAP === 'true' || process.env.SKIP_BOOTSTRAP === '1';

const host = process.env.HOST?.trim() || '0.0.0.0';
const port = process.env.PORT?.trim() || '3000';

async function runSidecars() {
  if (!skipBootstrap) {
    await run('npm', ['run', 'storage:bootstrap']);
  }
  if (!skipMigrate) {
    await run('npm', ['run', 'db:deploy']);
  }
}

if (migrateOnly) {
  await runSidecars();
  process.exit(0);
}

// Bootstrap + migrate run in parallel with Next so port 3000 opens sooner (K8s startup probe).
void runSidecars().catch((err) => {
  console.error('[run-production] bootstrap/migrate failed:', err);
  process.exit(1);
});

console.log(`[run-production] starting Next on ${host}:${port}`);
await run('npm', ['exec', '--', 'next', 'start', '--hostname', host, '--port', port]);