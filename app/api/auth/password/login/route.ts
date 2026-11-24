import { NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { normalizeIranMobile } from '@/src/lib/auth/phone';
import { serializeAuthUser } from '@/src/lib/auth/rbac';
import { createSession, setSessionCookie } from '@/src/lib/auth/session';
import { PENDING_MSG } from '@/src/lib/access-requests/service';
import {
  isUnconfiguredDbPreview,
  matchesPreviewAdminCredentials,
  PREVIEW_ADMIN_USER,
  setPreviewSessionCookie,
} from '@/src/lib/auth/preview-mode';

const bodySchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.parse(await req.json());
    const login = body.login.trim();
    const mobile = normalizeIranMobile(login);

    if (isUnconfiguredDbPreview()) {
      if (!matchesPreviewAdminCredentials(login, mobile, body.password)) {
        return jsonError('INVALID_CREDENTIALS', 'نام کاربری یا رمز عبور نادرست است.', 401);
      }
      await setPreviewSessionCookie(req);
      return jsonOk({ user: PREVIEW_ADMIN_USER });
    }

    const user = await prisma.user.findFirst({
      where: mobile
        ? { OR: [{ mobilePhone: mobile }, { username: login }] }
        : { username: login },
      include: { systemRole: true },
    });

    if (!user) {
      return jsonError('INVALID_CREDENTIALS', 'نام کاربری یا رمز عبور نادرست است.', 401);
    }

    if (user.status === 'pending') {
      return jsonError('PENDING_APPROVAL', PENDING_MSG, 403);
    }
    if (user.status === 'disabled') {
      return jsonError('ACCOUNT_DISABLED', 'حساب غیرفعال است. با مدیر تماس بگیرید.', 403);
    }

    if (!user.passwordHash) {
      return jsonError(
        'PASSWORD_NOT_SET',
        'برای این حساب رمز تعریف نشده — از ورود با پیامک استفاده کنید.',
        400
      );
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return jsonError('INVALID_CREDENTIALS', 'نام کاربری یا رمز عبور نادرست است.', 401);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const { token, expiresAt } = await createSession(user.id, req);
    await setSessionCookie(token, expiresAt, req);

    return jsonOk({ user: serializeAuthUser(user) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError('VALIDATION_ERROR', 'ورودی نامعتبر است.', 400);
    }
    return handleAuthRouteError(err, 'password-login');
  }
}
