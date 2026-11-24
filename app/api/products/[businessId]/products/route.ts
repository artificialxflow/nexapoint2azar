import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { createProduct } from '@/src/lib/products/catalog-service';

type Ctx = { params: Promise<{ businessId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = (await req.json()) as { product?: unknown } & Record<string, unknown>;
    const raw = body.product ?? body;
    const product = await createProduct(businessId, raw);
    return jsonOk({ product }, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'products.create');
  }
}
