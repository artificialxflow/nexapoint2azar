import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { deletePhoneDirectoryEntry, updatePhoneDirectoryEntry } from '@/src/lib/erp/phone-directory-service';
import { PeopleNotFoundError } from '@/src/lib/erp/people-service';

type Ctx = { params: Promise<{ id: string; entryId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id, entryId } = await ctx.params;
    await requireBusinessAccess(req, id);
    const body = await req.json();
    const entry = await updatePhoneDirectoryEntry(id, entryId, body);
    return jsonOk({ entry });
  } catch (err) {
    if (err instanceof PeopleNotFoundError) return jsonError('NOT_FOUND', err.message, 404);
    return handleAuthRouteError(err, 'phone.directory.patch');
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { id, entryId } = await ctx.params;
    await requireBusinessAccess(req, id);
    await deletePhoneDirectoryEntry(id, entryId);
    return jsonOk({ deleted: true });
  } catch (err) {
    if (err instanceof PeopleNotFoundError) return jsonError('NOT_FOUND', err.message, 404);
    return handleAuthRouteError(err, 'phone.directory.delete');
  }
}
