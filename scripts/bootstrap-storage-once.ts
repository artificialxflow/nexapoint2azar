import { bootstrapStorage } from '@/src/lib/storage/bootstrap';
import { getStorageRoot } from '@/src/lib/storage/config';

async function main() {
  await bootstrapStorage();
  console.log('[storage] ready at', getStorageRoot());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
