/**
 * Delete all business-scoped data (Business cascade) while keeping User + SystemRole.
 * Clears sessions, OTP challenges, invites, and access requests so users can re-onboard.
 *
 * Usage:
 *   npx tsx scripts/reset-business-data-keep-users.ts --dry-run
 *   npx tsx scripts/reset-business-data-keep-users.ts --confirm
 *
 * Does not run db:seed. Slice files under NEXA_STORAGE_ROOT are not removed.
 */
import { prisma } from '../src/lib/db/prisma';

const dryRun = process.argv.includes('--dry-run');
const confirm = process.argv.includes('--confirm');

async function counts() {
  const [
    businesses,
    users,
    sessions,
    otp,
    invites,
    accessRequests,
    people,
    moneyDocs,
  ] = await Promise.all([
    prisma.business.count(),
    prisma.user.count(),
    prisma.session.count(),
    prisma.otpChallenge.count(),
    prisma.userInvite.count(),
    prisma.accessRequest.count(),
    prisma.person.count(),
    prisma.moneyDocument.count(),
  ]);
  return { businesses, users, sessions, otp, invites, accessRequests, people, moneyDocs };
}

async function main() {
  const before = await counts();
  console.log('Current counts:', before);

  if (dryRun) {
    console.log(
      'dry-run: would delete all Business rows (cascade) and clear Session, OtpChallenge, UserInvite, AccessRequest.'
    );
    console.log(`dry-run: would keep ${before.users} User record(s).`);
    return;
  }

  if (!confirm) {
    console.error('Refusing to run without --confirm (use --dry-run to preview).');
    process.exit(1);
  }

  await prisma.$transaction([
    prisma.business.deleteMany({}),
    prisma.session.deleteMany({}),
    prisma.otpChallenge.deleteMany({}),
    prisma.userInvite.deleteMany({}),
    prisma.accessRequest.deleteMany({}),
  ]);

  const after = await counts();
  console.log('After reset:', after);
  console.log('Done. Users can sign in and create or join a business again.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
