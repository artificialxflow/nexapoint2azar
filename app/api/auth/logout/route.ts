import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { clearSessionCookie, destroySessionFromRequest } from '@/src/lib/auth/session';
import { clearPreviewSessionCookie, isUnconfiguredDbPreview } from '@/src/lib/auth/preview-mode';

export async function POST(req: NextRequest) {
  try {
    if (isUnconfiguredDbPreview()) {
      await clearPreviewSessionCookie(req);
      return jsonOk({ loggedOut: true });
    }
    await destroySessionFromRequest(req);
    await clearSessionCookie(req);
    return jsonOk({ loggedOut: true });
  } catch (err) {
    return handleAuthRouteError(err, 'logout');
  }
}
