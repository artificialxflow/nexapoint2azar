import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { listCrmPipelineBoard } from '@/src/lib/erp/crm-pipeline-service';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const board = await listCrmPipelineBoard(id);
    return jsonOk(board);
  } catch (err) {
    return handleAuthRouteError(err, 'crm.pipeline.get');
  }
}
