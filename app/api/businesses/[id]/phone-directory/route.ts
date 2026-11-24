import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { createPhoneDirectoryEntry, listPhoneDirectory } from '@/src/lib/erp/phone-directory-service';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const access = await requireBusinessAccess(req, id);
    const viewerRoleSlugs = [
      access.user.systemRole.slug,
      access.memberRole,
    ].filter(Boolean);
    const search = req.nextUrl.searchParams.get('q') ?? undefined;
    const entries = await listPhoneDirectory(id, { viewerRoleSlugs, search });
    return jsonOk({ entries });
  } catch (err) {
    return handleAuthRouteError(err, 'phone.directory.list');
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const body = await req.json();
    const entry = await createPhoneDirectoryEntry(id, body);
    return jsonOk({ entry }, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'phone.directory.create');
  }
}
