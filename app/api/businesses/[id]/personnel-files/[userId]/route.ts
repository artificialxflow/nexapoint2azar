import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { getPersonnelFile, upsertPersonnelFile } from '@/src/lib/meizito/personnel-file-service';
import { resolvePersonnelFileAccess } from '@/src/lib/meizito/personnel-file-access';

type Ctx = { params: Promise<{ id: string; userId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id, userId } = await ctx.params;
    const access = await requireBusinessAccess(req, id);
    const acl = await resolvePersonnelFileAccess(id, access.user.id, userId, access.memberRole);
    if (!acl.canRead) {
      return jsonError('FORBIDDEN', 'دسترسی به پرونده این پرسنل مجاز نیست.', 403);
    }
    const file = await getPersonnelFile(id, userId);
    return jsonOk({ file, access: acl });
  } catch (err) {
    return handleAuthRouteError(err, 'personnel.file.get');
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id, userId } = await ctx.params;
    const access = await requireBusinessAccess(req, id);
    const body = await req.json();
    const acl = await resolvePersonnelFileAccess(id, access.user.id, userId, access.memberRole);
    if (!acl.canEdit) {
      return jsonError('FORBIDDEN', 'فقط خودتان، مدیر مستقیم یا ادمین می‌تواند پرونده را ویرایش کند.', 403);
    }
    const row = await upsertPersonnelFile(id, {
      userId,
      payload: body.payload,
      formTemplateId: body.formTemplateId,
    });
    return jsonOk({
      file: {
        userId: row.userId,
        payload: row.payload,
        formTemplateId: row.formTemplateId,
      },
    });
  } catch (err) {
    return handleAuthRouteError(err, 'personnel.file.patch');
  }
}
