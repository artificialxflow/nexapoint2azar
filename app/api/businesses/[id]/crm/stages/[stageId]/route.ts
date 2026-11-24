import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { deleteCrmPipelineStage, updateCrmPipelineStage } from '@/src/lib/erp/crm-pipeline-service';
import { PeopleNotFoundError } from '@/src/lib/erp/people-service';

type Ctx = { params: Promise<{ id: string; stageId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id, stageId } = await ctx.params;
    await requireBusinessAccess(req, id);
    const body = await req.json();
    const stage = await updateCrmPipelineStage(id, stageId, body);
    return jsonOk({ stage });
  } catch (err) {
    if (err instanceof PeopleNotFoundError) return jsonError('NOT_FOUND', err.message, 404);
    return handleAuthRouteError(err, 'crm.stages.patch');
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { id, stageId } = await ctx.params;
    await requireBusinessAccess(req, id);
    await deleteCrmPipelineStage(id, stageId);
    return jsonOk({ deleted: true });
  } catch (err) {
    if (err instanceof PeopleNotFoundError) return jsonError('NOT_FOUND', err.message, 404);
    return handleAuthRouteError(err, 'crm.stages.delete');
  }
}
