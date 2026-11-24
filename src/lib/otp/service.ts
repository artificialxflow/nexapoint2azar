import { createHash, randomInt } from 'crypto';
import { prisma } from '@/src/lib/db/prisma';
import { getOtpConfig } from '@/src/lib/otp/config';
import { sendOtpSms } from '@/src/lib/sms/send';
import { createLogger, maskPhone } from '@/src/lib/logger';
import { handleUnknownMobileForOtp, PENDING_MSG, REVIEW_MSG } from '@/src/lib/access-requests/service';

const log = createLogger('otp');

function hashCode(mobilePhone: string, code: string): string {
  const secret = process.env.AUTH_SESSION_SECRET ?? 'dev-insecure';
  return createHash('sha256').update(`${mobilePhone}:${code}:${secret}`).digest('hex');
}

function generateCode(length: number): string {
  const max = 10 ** length;
  const n = randomInt(0, max);
  return n.toString().padStart(length, '0');
}

export async function requestOtpForMobile(
  mobilePhone: string,
  ip?: string
): Promise<
  | { ok: true; sent: true }
  | { ok: true; sent: false; pending: true; message: string }
  | { ok: false; code: string; message: string }
> {
  const cfg = getOtpConfig();

  const pendingUser = await prisma.user.findFirst({
    where: { mobilePhone, status: 'pending' },
  });
  if (pendingUser) {
    return { ok: true, sent: false, pending: true, message: PENDING_MSG };
  }

  const user = await prisma.user.findFirst({
    where: { mobilePhone, status: 'active' },
  });
  if (!user) {
    const access = await handleUnknownMobileForOtp(mobilePhone);
    if (access.kind === 'pending' || access.kind === 'created') {
      return { ok: true, sent: false, pending: true, message: access.message };
    }
    return {
      ok: false,
      code: 'ACCESS_DENIED',
      message: access.kind === 'rejected' ? access.message : REVIEW_MSG,
    };
  }

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const sentToday = await prisma.otpChallenge.count({
    where: { mobilePhone, createdAt: { gte: dayStart } },
  });
  if (sentToday >= cfg.OTP_MAX_SEND_PER_PHONE_PER_DAY) {
    return {
      ok: false,
      code: 'RATE_LIMIT',
      message: 'سقف ارسال پیامک امروز تکمیل شده است.',
    };
  }

  const latest = await prisma.otpChallenge.findFirst({
    where: { mobilePhone, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (latest) {
    const cooldownMs = cfg.OTP_RESEND_COOLDOWN_SECONDS * 1000;
    if (Date.now() - latest.createdAt.getTime() < cooldownMs) {
      return {
        ok: false,
        code: 'COOLDOWN',
        message: 'لطفاً چند ثانیه صبر کنید و دوباره تلاش کنید.',
      };
    }
  }

  const code = generateCode(cfg.OTP_LENGTH);
  const expiresAt = new Date(Date.now() + cfg.OTP_TTL_SECONDS * 1000);

  await prisma.otpChallenge.create({
    data: {
      mobilePhone,
      codeHash: hashCode(mobilePhone, code),
      expiresAt,
      ip,
    },
  });

  try {
    await sendOtpSms(mobilePhone, code);
  } catch (e) {
    log.error('send failed', { mobile: maskPhone(mobilePhone), error: String(e) });
    return {
      ok: false,
      code: 'SMS_FAILED',
      message: 'ارسال پیامک ناموفق بود.',
    };
  }

  log.info('otp requested', { mobile: maskPhone(mobilePhone) });
  return { ok: true, sent: true };
}

export async function verifyOtpForMobile(
  mobilePhone: string,
  code: string
): Promise<
  | { ok: true; userId: string }
  | { ok: false; code: string; message: string }
> {
  const cfg = getOtpConfig();

  const challenge = await prisma.otpChallenge.findFirst({
    where: { mobilePhone, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!challenge) {
    return { ok: false, code: 'NO_CHALLENGE', message: 'کد منقضی شده — دوباره درخواست دهید.' };
  }

  if (challenge.expiresAt <= new Date()) {
    return { ok: false, code: 'EXPIRED', message: 'کد منقضی شده است.' };
  }

  if (challenge.attemptCount >= cfg.OTP_MAX_VERIFY_ATTEMPTS) {
    return { ok: false, code: 'LOCKED', message: 'تعداد تلاش بیش از حد — کد جدید بگیرید.' };
  }

  const valid = hashCode(mobilePhone, code.trim()) === challenge.codeHash;
  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: {
      attemptCount: challenge.attemptCount + 1,
      consumedAt: valid ? new Date() : challenge.consumedAt,
    },
  });

  if (!valid) {
    return { ok: false, code: 'INVALID_CODE', message: 'کد نادرست است.' };
  }

  const user = await prisma.user.findFirst({
    where: { mobilePhone, status: 'active' },
  });
  if (!user) {
    return { ok: false, code: 'MOBILE_NOT_REGISTERED', message: 'کاربر یافت نشد.' };
  }

  return { ok: true, userId: user.id };
}
