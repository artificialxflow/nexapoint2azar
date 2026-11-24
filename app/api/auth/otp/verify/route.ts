import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { normalizeIranMobile } from '@/src/lib/auth/phone';
import { serializeAuthUser } from '@/src/lib/auth/rbac';
import { createSession, setSessionCookie } from '@/src/lib/auth/session';
import { verifyOtpForMobile } from '@/src/lib/otp/service';

const bodySchema = z.object({
  mobile: z.string().min(10),
  code: z.string().min(4).max(8),
});

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.parse(await req.json());
    const mobile = normalizeIranMobile(body.mobile);
    if (!mobile) {
      return jsonError('VALIDATION_ERROR', 'شماره موبایل معتبر نیست.', 400);
    }

    const verified = await verifyOtpForMobile(mobile, body.code);
    if (!verified.ok) {
      return jsonError(verified.code, verified.message, 400);
    }

    await prisma.user.update({
      where: { id: verified.userId },
      data: { lastLoginAt: new Date() },
    });

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: verified.userId },
      include: { systemRole: true },
    });

    const { token, expiresAt } = await createSession(user.id, req);
    await setSessionCookie(token, expiresAt, req);

    return jsonOk({ user: serializeAuthUser(user) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError('VALIDATION_ERROR', 'ورودی نامعتبر است.', 400);
    }
    return handleAuthRouteError(err, 'otp-verify');
  }
}
