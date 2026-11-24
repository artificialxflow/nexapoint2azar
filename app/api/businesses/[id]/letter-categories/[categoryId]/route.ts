import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { assertCanManageBusiness, requireBusinessAccess } from '@/src/lib/business/access';
import { deleteLetterCategoryConfig } from '@/src/lib/meizito/letter-category-admin';

type Ctx = { params: Promise<{ id: string; categoryId: string }> };

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { id, categoryId } = await ctx.params;
    const access = await requireBusinessAccess(req, id);
    assertCanManageBusiness(access.memberRole);
    await deleteLetterCategoryConfig(id, categoryId);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleAuthRouteError(err, 'letter.categories.delete');
  }
}
