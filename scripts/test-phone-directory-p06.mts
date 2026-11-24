/**
 * Smoke: phone directory P06 fields (needs DATABASE_URL).
 * Run: npx tsx scripts/test-phone-directory-p06.mts
 */
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db/prisma';
import {
  createPhoneDirectoryEntry,
  listPhoneDirectory,
} from '../src/lib/erp/phone-directory-service';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log('skip: DATABASE_URL not set');
    return;
  }
  const business = await prisma.business.findFirst({ select: { id: true } });
  assert.ok(business, 'need business');

  const created = await createPhoneDirectoryEntry(business.id, {
    displayName: 'تست دفتر تلفن',
    mobile: '09120000000',
    entryKind: 'internal',
    visibilityTags: ['production'],
  });
  assert.equal(created.entryKind, 'internal');
  assert.deepEqual(created.visibilityTags, ['production']);
  assert.equal(created.personId, undefined);

  const visible = await listPhoneDirectory(business.id, { viewerRoleSlugs: ['production'] });
  assert.ok(visible.some((e) => e.id === created.id));

  const hidden = await listPhoneDirectory(business.id, { viewerRoleSlugs: ['other-role'] });
  assert.ok(!hidden.some((e) => e.id === created.id));

  await prisma.phoneDirectoryEntry.delete({ where: { id: created.id } });
  console.log('test-phone-directory-p06 ok');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
