import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { CatalogNotFoundError, deleteProduct, updateProduct } from '@/src/lib/products/catalog-service';
import type { Product } from '@/src/types/product';

type Ctx = { params: Promise<{ businessId: string; productId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { businessId, productId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = (await req.json()) as { product?: Product } & Partial<Product>;
    const patch = body.product ?? body;
    const product = await updateProduct(businessId, productId, patch);
    return jsonOk({ product });
  } catch (err) {
    if (err instanceof CatalogNotFoundError) {
      return jsonError('NOT_FOUND', err.message, 404);
    }
    return handleAuthRouteError(err, 'products.patch');
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { businessId, productId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    await deleteProduct(businessId, productId);
    return jsonOk({ ok: true });
  } catch (err) {
    if (err instanceof CatalogNotFoundError) {
      return jsonError('NOT_FOUND', err.message, 404);
    }
    return handleAuthRouteError(err, 'products.delete');
  }
}
