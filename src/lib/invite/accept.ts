import { prisma } from '@/src/lib/db/prisma';
import { usernameFromMobile, fallbackUsername } from '@/src/lib/auth/username';

export async function attachUserToInviterBusiness(userId: string, inviterUserId: string) {
  const membership = await prisma.businessMember.findFirst({
    where: { userId: inviterUserId },
  });
  if (!membership) return;
  const exists = await prisma.businessMember.findFirst({
    where: { businessId: membership.businessId, userId },
  });
  if (exists) return;
  await prisma.businessMember.create({
    data: {
      businessId: membership.businessId,
      userId,
      role: 'member',
    },
  });
}

export async function uniqueUsername(preferred: string): Promise<string> {
  const taken = await prisma.user.findUnique({ where: { username: preferred } });
  if (!taken) return preferred;
  let i = 1;
  while (i < 100) {
    const candidate = `${preferred}_${i}`;
    const again = await prisma.user.findUnique({ where: { username: candidate } });
    if (!again) return candidate;
    i += 1;
  }
  return fallbackUsername();
}

export async function usernameForMobile(mobilePhone: string): Promise<string> {
  return uniqueUsername(usernameFromMobile(mobilePhone));
}
