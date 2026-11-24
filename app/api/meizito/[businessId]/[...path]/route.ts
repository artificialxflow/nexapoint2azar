import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { handleMeizitoRequest } from '@/src/lib/meizito/server-handler';
import { MeizitoHttpError } from '@/src/lib/meizito/meizito-http-error';

type Ctx = { params: Promise<{ businessId: string; path: string[] }> };

const MEIZITO_PRIVATE_HEADERS: HeadersInit = {
  'Cache-Control': 'private, no-store',
  Vary: 'Cookie',
};

async function dispatch(req: NextRequest, ctx: Ctx) {
  const { businessId, path } = await ctx.params;
  await requireBusinessAccess(req, businessId);
  try {
    const data = await handleMeizitoRequest(req, businessId, path);
    return jsonOk(data, { headers: MEIZITO_PRIVATE_HEADERS });
  } catch (err) {
    if (err instanceof MeizitoHttpError) {
      const code = err.status === 403 ? 'FORBIDDEN' : err.status === 404 ? 'NOT_FOUND' : 'VALIDATION';
      return jsonError(code, err.message, err.status);
    }
    throw err;
  }
}

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    return await dispatch(req, ctx);
  } catch (err) {
    return handleAuthRouteError(err, 'meizito.get');
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    return await dispatch(req, ctx);
  } catch (err) {
    return handleAuthRouteError(err, 'meizito.post');
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    return await dispatch(req, ctx);
  } catch (err) {
    return handleAuthRouteError(err, 'meizito.patch');
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    return await dispatch(req, ctx);
  } catch (err) {
    return handleAuthRouteError(err, 'meizito.delete');
  }
}
