import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { catalogModuleSchema } from '@/src/lib/erp/commerce-zod';
import { getCatalogModule, saveCatalogModule } from '@/src/lib/products/catalog-service';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    return jsonOk(await getCatalogModule(id));
  } catch (err) {
    return handleAuthRouteError(err, 'erp.catalog.module.get');
  }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const body = catalogModuleSchema.parse(await req.json());
    return jsonOk(await saveCatalogModule(id, body));
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError('VALIDATION', err.errors[0]?.message ?? 'داده نامعتبر', 400);
    }
    return handleAuthRouteError(err, 'erp.catalog.module.put');
  }
}
