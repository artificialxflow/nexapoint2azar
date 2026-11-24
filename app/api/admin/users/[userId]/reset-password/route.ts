import { NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { requirePermission } from '@/src/lib/auth/admin-access';

type Ctx = { params: Promise<{ userId: string }> };

const schema = z.object({
  newPassword: z.string().min(6),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    await requirePermission(req, 'users:write');
    const { userId } = await ctx.params;
    const body = schema.parse(await req.json());
    const passwordHash = await bcrypt.hash(body.newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });
    return jsonOk({ ok: true });
  } catch (err) {
    return handleAuthRouteError(err, 'admin.users.reset-password');
  }
}
