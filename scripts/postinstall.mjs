import { spawn } from 'node:child_process';

function isTruthy(v) {
  return v === '1' || v === 'true' || v === 'yes';
}

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

function shouldBuildAfterInstall() {
  if (isTruthy(process.env.NEXA_SKIP_POSTINSTALL_BUILD)) return false;
  if (isTruthy(process.env.RUNFLARE)) return true;
  if (isTruthy(process.env.NEXA_BUILD_ON_INSTALL)) return true;
  if (process.env.NODE_ENV === 'production') return true;
  return false;
}

await run('npm', ['exec', '--', 'prisma', 'generate']);

if (!shouldBuildAfterInstall()) {
  console.log('[postinstall] skip next build (set RUNFLARE=1 or NODE_ENV=production on server)');
  process.exit(0);
}

console.log('[postinstall] production install — running next build');
await run('npm', ['exec', '--', 'next', 'build']);