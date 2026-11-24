import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { deleteCrmClubMember, PeopleNotFoundError, updateCrmClubMember } from '@/src/lib/erp/people-service';

type Ctx = { params: Promise<{ id: string; memberId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id, memberId } = await ctx.params;
    await requireBusinessAccess(req, id);
    const body = await req.json();
    const member = await updateCrmClubMember(id, memberId, body);
    return jsonOk({ member });
  } catch (err) {
    if (err instanceof PeopleNotFoundError) return jsonError('NOT_FOUND', err.message, 404);
    return handleAuthRouteError(err, 'crm.club.patch');
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { id, memberId } = await ctx.params;
    await requireBusinessAccess(req, id);
    await deleteCrmClubMember(id, memberId);
    return jsonOk({ deleted: true });
  } catch (err) {
    if (err instanceof PeopleNotFoundError) return jsonError('NOT_FOUND', err.message, 404);
    return handleAuthRouteError(err, 'crm.club.delete');
  }
}
