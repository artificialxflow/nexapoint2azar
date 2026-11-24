import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireSessionUser } from '@/src/lib/auth/session';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'رمز فعلی الزامی است.'),
  newPassword: z.string().min(8, 'رمز جدید باید حداقل ۸ کاراکتر باشد.').max(128),
});

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await requireSessionUser(req);
    const body = changePasswordSchema.parse(await req.json());

    const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
    if (!user) {
      return jsonError('NOT_FOUND', 'کاربر یافت نشد.', 404);
    }

    if (user.passwordHash) {
      const matches = await bcrypt.compare(body.currentPassword, user.passwordHash);
      if (!matches) {
        return jsonError('INVALID_CREDENTIALS', 'رمز عبور فعلی نادرست است.', 400);
      }
    }

    const nextHash = await bcrypt.hash(body.newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: nextHash,
        mustChangePassword: false,
      },
    });

    return jsonOk({ updated: true });
  } catch (err) {
    return handleAuthRouteError(err, 'auth.changePassword');
  }
}
