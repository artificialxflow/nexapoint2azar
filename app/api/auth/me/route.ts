import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { serializeAuthUser } from '@/src/lib/auth/rbac';
import { getSessionFromRequest, requireSessionUser, setSessionCookie } from '@/src/lib/auth/session';
import { removeUploadFile } from '@/src/lib/media/remove-upload';
import {
  hasValidPreviewSession,
  isUnconfiguredDbPreview,
  PREVIEW_ADMIN_USER,
} from '@/src/lib/auth/preview-mode';

const patchSchema = z.object({
  avatarFileKey: z.string().min(1).nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    if (isUnconfiguredDbPreview()) {
      if (!hasValidPreviewSession(req)) {
        return jsonError('UNAUTHORIZED', 'لطفاً وارد شوید.', 401);
      }
      return jsonOk({ user: PREVIEW_ADMIN_USER });
    }

    const session = await getSessionFromRequest(req);
    if (!session) {
      return jsonError('UNAUTHORIZED', 'لطفاً وارد شوید.', 401);
    }
    if (session.renewed) {
      await setSessionCookie(session.token, session.expiresAt, req);
    }
    return jsonOk({ user: serializeAuthUser(session.user) });
  } catch (err) {
    return handleAuthRouteError(err, 'me');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const sessionUser = await requireSessionUser(req);
    const body = patchSchema.parse(await req.json());

    if (body.avatarFileKey === undefined) {
      return jsonError('VALIDATION_ERROR', 'فیلدی برای به‌روزرسانی ارسال نشده است.', 400);
    }

    const existing = await prisma.user.findUniqueOrThrow({
      where: { id: sessionUser.id },
      include: { systemRole: true },
    });

    const prevKey = existing.avatarFileKey?.trim() || null;
    const nextKey = body.avatarFileKey?.trim() || null;
    if (nextKey !== prevKey && prevKey) {
      await removeUploadFile(prevKey);
    }

    const user = await prisma.user.update({
      where: { id: sessionUser.id },
      data: { avatarFileKey: nextKey },
      include: { systemRole: true },
    });

    return jsonOk({ user: serializeAuthUser(user) });
  } catch (err) {
    return handleAuthRouteError(err, 'me.patch');
  }
}