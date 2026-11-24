import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { assertCanManageBusiness, requireBusinessAccess } from '@/src/lib/business/access';
import {
  createLetterCategoryConfig,
  listLetterCategoryConfigs,
} from '@/src/lib/meizito/letter-category-admin';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const categories = await listLetterCategoryConfigs(id);
    return jsonOk({ categories });
  } catch (err) {
    return handleAuthRouteError(err, 'letter.categories.list');
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const access = await requireBusinessAccess(req, id);
    assertCanManageBusiness(access.memberRole);
    const body = await req.json();
    const category = await createLetterCategoryConfig(id, body);
    return jsonOk({ category }, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'letter.categories.create');
  }
}
