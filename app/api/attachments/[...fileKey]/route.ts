import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { handleAuthRouteError } from '@/src/lib/auth/api';
import { requireSessionUser } from '@/src/lib/auth/session';
import { resolveUploadAbsolute } from '@/src/lib/storage/uploads';

type Ctx = { params: Promise<{ fileKey: string[] }> };

const MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    await requireSessionUser(req);
    const { fileKey } = await ctx.params;
    const relative = fileKey.join('/');
    const absolute = resolveUploadAbsolute(relative);
    if (!absolute) {
      return handleAuthRouteError(new Error('NOT_FOUND'), 'attachments.get');
    }
    const data = await readFile(absolute);
    const ext = path.extname(absolute).toLowerCase();
    const contentType = MIME[ext] ?? 'application/octet-stream';
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err) {
    return handleAuthRouteError(err, 'attachments.get');
  }
}
