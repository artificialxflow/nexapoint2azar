import { prisma } from '@/src/lib/db/prisma';

export const PENDING_MSG =
  'درخواست شما ثبت شد و در دست بررسی مدیر است. پس از تأیید می‌توانید با همان شماره وارد شوید.';

export const REVIEW_MSG =
  'درخواست دسترسی شما رد شده است. برای پیگیری با مدیر سیستم تماس بگیرید.';

export type UnknownMobileResult =
  | { kind: 'active' }
  | { kind: 'pending' | 'created'; message: string }
  | { kind: 'rejected'; message: string };

export async function handleUnknownMobileForOtp(mobilePhone: string): Promise<UnknownMobileResult> {
  const active = await prisma.user.findFirst({
    where: { mobilePhone, status: 'active' },
  });
  if (active) return { kind: 'active' as const };

  const pendingUser = await prisma.user.findFirst({
    where: { mobilePhone, status: 'pending' },
  });
  if (pendingUser) {
    return { kind: 'pending' as const, message: PENDING_MSG };
  }

  const pendingReq = await prisma.accessRequest.findFirst({
    where: { mobilePhone, status: 'pending' },
    orderBy: { createdAt: 'desc' },
  });
  if (pendingReq) {
    return { kind: 'pending' as const, message: PENDING_MSG };
  }

  const rejected = await prisma.accessRequest.findFirst({
    where: { mobilePhone, status: 'rejected' },
    orderBy: { createdAt: 'desc' },
  });
  if (rejected) {
    return { kind: 'rejected' as const, message: REVIEW_MSG };
  }

  await prisma.accessRequest.create({
    data: { mobilePhone },
  });

  return { kind: 'created' as const, message: PENDING_MSG };
}

