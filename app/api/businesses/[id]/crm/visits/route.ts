import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { createCrmVisit, listCrmVisits } from '@/src/lib/erp/people-service';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const visits = await listCrmVisits(id);
    return jsonOk({ visits });
  } catch (err) {
    return handleAuthRouteError(err, 'crm.visits.list');
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const body = await req.json();
    const visit = await createCrmVisit(id, body);
    return jsonOk({ visit }, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'crm.visits.create');
  }
}
