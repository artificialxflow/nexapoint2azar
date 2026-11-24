import { spawn } from 'node:child_process';

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: true });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
    });
  });
}

const migrateOnly = process.env.MIGRATE_ONLY === 'true' || process.env.MIGRATE_ONLY === '1';
const skipMigrate = process.env.SKIP_MIGRATE === 'true' || process.env.SKIP_MIGRATE === '1';

const host = process.env.HOST?.trim() || '0.0.0.0';
const port = process.env.PORT?.trim() || '3000';

await run('npm', ['run', 'storage:bootstrap']);

if (!skipMigrate) {
  await run('npm', ['run', 'db:deploy']);
}

if (migrateOnly) {
  process.exit(0);
}

await run('npm', ['exec', '--', 'next', 'start', '--hostname', host, '--port', port]);