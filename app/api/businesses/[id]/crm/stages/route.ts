import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { createCrmPipelineStage } from '@/src/lib/erp/crm-pipeline-service';
import { PeopleNotFoundError } from '@/src/lib/erp/people-service';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const body = await req.json();
    const stage = await createCrmPipelineStage(id, body);
    return jsonOk({ stage }, { status: 201 });
  } catch (err) {
    if (err instanceof PeopleNotFoundError) return jsonError('NOT_FOUND', err.message, 404);
    return handleAuthRouteError(err, 'crm.stages.create');
  }
}
