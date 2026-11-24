import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { commerceModuleSchema } from '@/src/lib/erp/commerce-zod';
import {
  getCommerceModule,
  saveCommerceModule,
} from '@/src/lib/erp/commerce-service';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const module = await getCommerceModule(id);
    return jsonOk(module);
  } catch (err) {
    return handleAuthRouteError(err, 'erp.commerce.module.get');
  }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const body = commerceModuleSchema.parse(await req.json());
    const module = await saveCommerceModule(id, body);
    return jsonOk(module);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError('VALIDATION', err.errors[0]?.message ?? 'داده نامعتبر', 400);
    }
    return handleAuthRouteError(err, 'erp.commerce.module.put');
  }
}
