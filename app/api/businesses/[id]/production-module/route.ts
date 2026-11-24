import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { productionModuleSchema } from '@/src/lib/erp/production-zod';
import {
  getProductionModule,
  ProductionValidationError,
  saveProductionModule,
} from '@/src/lib/erp/production-service';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const module = await getProductionModule(id);
    return jsonOk(module);
  } catch (err) {
    return handleAuthRouteError(err, 'erp.production.module.get');
  }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const body = productionModuleSchema.parse(await req.json());
    const module = await saveProductionModule(id, body);
    return jsonOk(module);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError('VALIDATION', err.errors[0]?.message ?? 'داده نامعتبر', 400);
    }
    if (err instanceof ProductionValidationError) {
      return jsonError('VALIDATION', err.message, 400);
    }
    return handleAuthRouteError(err, 'erp.production.module.put');
  }
}
