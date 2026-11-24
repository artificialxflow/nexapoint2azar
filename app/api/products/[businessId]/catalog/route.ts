import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { getCatalog } from '@/src/lib/products/catalog-service';

type Ctx = { params: Promise<{ businessId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const catalog = await getCatalog(businessId);
    return jsonOk(catalog);
  } catch (err) {
    return handleAuthRouteError(err, 'products.catalog');
  }
}
