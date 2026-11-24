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

await run('npx', ['tsx', 'scripts/bootstrap-storage-once.ts']);

if (!skipMigrate) {
  await run('npx', ['prisma', 'migrate', 'deploy']);
}

if (migrateOnly) {
  process.exit(0);
}

await run('npx', ['next', 'start']);
