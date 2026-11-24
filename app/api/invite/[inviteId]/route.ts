import { NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { normalizeIranMobile } from '@/src/lib/auth/phone';
import { hashInviteToken } from '@/src/lib/invite/token';
import { attachUserToInviterBusiness, usernameForMobile } from '@/src/lib/invite/accept';

type Ctx = { params: Promise<{ inviteId: string }> };

async function loadInvite(inviteId: string, rawToken: string | null) {
  if (!rawToken) {
    return { error: jsonError('VALIDATION_ERROR', 'لینک دعوت ناقص است — پارامتر t وجود ندارد.', 400) };
  }
  const invite = await prisma.userInvite.findUnique({
    where: { id: inviteId },
    include: { createdBy: { select: { displayName: true } } },
  });
  if (!invite) {
    return { error: jsonError('NOT_FOUND', 'دعوت‌نامه یافت نشد.', 404) };
  }
  if (invite.usedAt) {
    return { error: jsonError('INVITE_USED', 'این لینک قبلاً استفاده شده است.', 410) };
  }
  if (invite.expiresAt <= new Date()) {
    return { error: jsonError('INVITE_EXPIRED', 'اعتبار این لینک به پایان رسیده است.', 410) };
  }
  const expected = hashInviteToken(rawToken);
  if (expected !== invite.tokenHash) {
    return { error: jsonError('INVITE_INVALID', 'لینک دعوت نامعتبر است.', 403) };
  }
  const role = await prisma.systemRole.findUnique({ where: { slug: invite.roleSlug } });
  if (!role) {
    return { error: jsonError('NOT_FOUND', 'نقش سیستمی یافت نشد.', 404) };
  }
  return { invite, role };
}

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { inviteId } = await ctx.params;
    const t = req.nextUrl.searchParams.get('t');
    const loaded = await loadInvite(inviteId, t);
    if ('error' in loaded) return loaded.error;
    const { invite, role } = loaded;

    const mode = invite.credentialMode as 'self' | 'manual' | 'auto';
    return jsonOk({
      invite: {
        role: { slug: role.slug, nameFa: role.nameFa },
        expiresAt: invite.expiresAt.toISOString(),
        invitedBy: invite.createdBy.displayName,
        displayName: invite.displayName,
        credentialMode: mode,
        presetUsername: invite.presetUsername,
        presetMobile: invite.mobilePhone,
      },
    });
  } catch (err) {
    return handleAuthRouteError(err, 'invite.get');
  }
}

const postSchema = z.object({
  mobile: z.string().optional(),
  displayName: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { inviteId } = await ctx.params;
    const t = req.nextUrl.searchParams.get('t');
    const loaded = await loadInvite(inviteId, t);
    if ('error' in loaded) return loaded.error;
    const { invite, role } = loaded;

    const mode = invite.credentialMode as 'self' | 'manual' | 'auto';
    const body = postSchema.parse(await req.json().catch(() => ({})));

    let mobilePhone: string | null = invite.mobilePhone;
    let displayName = invite.displayName ?? body.displayName ?? 'کاربر جدید';
    let passwordHash: string | null = invite.presetPasswordHash;

    if (mode === 'self') {
      const rawMobile = body.mobile ?? invite.mobilePhone;
      if (!rawMobile) {
        return jsonError('VALIDATION_ERROR', 'شماره موبایل الزامی است.', 400);
      }
      const normalized = normalizeIranMobile(rawMobile);
      if (!normalized) {
        return jsonError('VALIDATION_ERROR', 'شماره موبایل معتبر نیست.', 400);
      }
      mobilePhone = normalized;
      if (body.displayName?.trim()) displayName = body.displayName.trim();
      if (body.password) {
        passwordHash = await bcrypt.hash(body.password, 12);
      }
    }

    if (!mobilePhone) {
      return jsonError('VALIDATION_ERROR', 'شماره موبایل برای این دعوت تعریف نشده است.', 400);
    }

    const existingMobile = await prisma.user.findFirst({ where: { mobilePhone } });
    if (existingMobile) {
      return jsonError('MOBILE_TAKEN', 'این شماره موبایل قبلاً ثبت شده است.', 409);
    }

    const username =
      invite.presetUsername ??
      (await usernameForMobile(mobilePhone));

    const user = await prisma.user.create({
      data: {
        username,
        displayName,
        mobilePhone,
        passwordHash,
        systemRoleId: role.id,
        status: 'active',
        mustChangePassword: mode === 'auto',
      },
    });

    await attachUserToInviterBusiness(user.id, invite.createdById);

    await prisma.userInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    });

    return jsonOk({ userId: user.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError('VALIDATION_ERROR', 'ورودی نامعتبر است.', 400);
    }
    return handleAuthRouteError(err, 'invite.accept');
  }
}
