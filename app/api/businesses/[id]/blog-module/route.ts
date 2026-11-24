import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { blogModuleSchema } from '@/src/lib/erp/commerce-zod';
import { getBlogModule, saveBlogModule } from '@/src/lib/erp/commerce-service';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    return jsonOk(await getBlogModule(id));
  } catch (err) {
    return handleAuthRouteError(err, 'erp.blog.module.get');
  }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const body = blogModuleSchema.parse(await req.json());
    return jsonOk(await saveBlogModule(id, body));
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError('VALIDATION', err.errors[0]?.message ?? 'داده نامعتبر', 400);
    }
    return handleAuthRouteError(err, 'erp.blog.module.put');
  }
}
