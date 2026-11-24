import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { createCrmLead, listCrmLeads } from '@/src/lib/erp/people-service';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const leads = await listCrmLeads(id);
    return jsonOk({ leads });
  } catch (err) {
    return handleAuthRouteError(err, 'crm.leads.list');
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const body = await req.json();
    const lead = await createCrmLead(id, body);
    return jsonOk({ lead }, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'crm.leads.create');
  }
}
