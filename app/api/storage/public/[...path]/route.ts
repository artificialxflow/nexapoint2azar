import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { resolveStoragePublicFile } from '@/src/lib/storage/paths';
import { bootstrapStorage } from '@/src/lib/storage/bootstrap';

const MIME: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
};

let bootstrapped = false;

async function ensureBootstrapped() {
  if (bootstrapped) return;
  await bootstrapStorage();
  bootstrapped = true;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  await ensureBootstrapped();
  const { path: segments } = await ctx.params;
  const relative = segments.join('/');
  const filePath = resolveStoragePublicFile(relative);
  if (!filePath) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] ?? 'application/octet-stream';
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
