import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { createCrmClubMember, listCrmClubMembers } from '@/src/lib/erp/people-service';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const members = await listCrmClubMembers(id);
    return jsonOk({ members });
  } catch (err) {
    return handleAuthRouteError(err, 'crm.club.list');
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const body = await req.json();
    const member = await createCrmClubMember(id, body);
    return jsonOk({ member }, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'crm.club.create');
  }
}
