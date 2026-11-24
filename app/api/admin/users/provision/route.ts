import { randomBytes } from 'crypto';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requirePermission } from '@/src/lib/auth/admin-access';
import { getAuthConfig } from '@/src/lib/auth/config';
import { normalizeIranMobile } from '@/src/lib/auth/phone';
import { hashInviteToken } from '@/src/lib/invite/token';
import { usernameForMobile } from '@/src/lib/invite/accept';
import { fallbackUsername } from '@/src/lib/auth/username';

const schema = z.object({
  displayName: z.string().min(1),
  systemRoleId: z.string().min(1),
  credentialMode: z.enum(['manual', 'auto', 'self']).optional(),
  delivery: z.enum(['direct', 'invite']).optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  mobilePhone: z.string().optional(),
  expiresInDays: z.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requirePermission(req, 'users:write');
    const body = schema.parse(await req.json());
    const delivery = body.delivery ?? 'direct';
    const credentialMode = body.credentialMode ?? (delivery === 'invite' ? 'self' : 'manual');

    const role = await prisma.systemRole.findUnique({ where: { id: body.systemRoleId } });
    if (!role) throw new Error('NOT_FOUND');

    let mobilePhone: string | null = null;
    if (body.mobilePhone) {
      mobilePhone = normalizeIranMobile(body.mobilePhone);
      if (!mobilePhone) {
        return jsonError('VALIDATION_ERROR', 'شماره موبایل معتبر نیست.', 400);
      }
    }

    if (delivery === 'invite') {
      const token = randomBytes(24).toString('hex');
      const days = body.expiresInDays ?? 7;
      const invite = await prisma.userInvite.create({
        data: {
          roleSlug: role.slug,
          tokenHash: hashInviteToken(token),
          displayName: body.displayName,
          mobilePhone,
          credentialMode,
          expiresAt: new Date(Date.now() + days * 86400000),
          createdById: admin.id,
        },
      });
      const base = getAuthConfig().NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
      return jsonOk({
        invite: { url: `${base}/invite/${invite.id}?t=${token}` },
      });
    }

    if (!mobilePhone) {
      return jsonError('VALIDATION_ERROR', 'برای ساخت فوری کاربر، شماره موبایل الزامی است.', 400);
    }

    const takenMobile = await prisma.user.findFirst({ where: { mobilePhone } });
    if (takenMobile) {
      return jsonError('MOBILE_TAKEN', 'این شماره موبایل قبلاً ثبت شده است.', 409);
    }

    const username = body.username?.trim() || (await usernameForMobile(mobilePhone));
    const password =
      body.password ||
      (credentialMode === 'auto' ? randomBytes(6).toString('base64url').slice(0, 10) : undefined);
    const passwordHash = password ? await bcrypt.hash(password, 12) : null;

    const user = await prisma.user.create({
      data: {
        username: username || fallbackUsername(),
        displayName: body.displayName,
        mobilePhone,
        passwordHash,
        systemRoleId: role.id,
        status: 'pending',
        mustChangePassword: credentialMode === 'auto' && Boolean(password),
      },
    });

    const membership = await prisma.businessMember.findFirst({
      where: { userId: admin.id },
    });
    if (membership) {
      await prisma.businessMember.create({
        data: {
          businessId: membership.businessId,
          userId: user.id,
          role: 'member',
        },
      });
    }

    return jsonOk({
      credentials: {
        mobilePhone,
        username: user.username,
        password: password ?? null,
        loginHint:
          'تا زمانی که مدیر «فعال‌سازی» نزند، ورود با پیامک یا رمز ممکن نیست. سپس: پیامک یا رمز پشتیبان.',
      },
    });
  } catch (err) {
    return handleAuthRouteError(err, 'admin.users.provision');
  }
}
