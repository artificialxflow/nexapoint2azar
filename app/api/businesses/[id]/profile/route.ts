import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess, assertCanManageBusiness } from '@/src/lib/business/access';
import { serializeProfile } from '@/src/lib/settings/serialize';
import { removeUploadFile } from '@/src/lib/media/remove-upload';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const profile = await prisma.businessProfile.findUniqueOrThrow({ where: { businessId: id } });
    return jsonOk({ profile: serializeProfile(profile) });
  } catch (err) {
    return handleAuthRouteError(err, 'business.profile.get');
  }
}

const patchSchema = z.object({
  legalName: z.string().optional(),
  tradeName: z.string().optional(),
  nationalId: z.string().optional(),
  economicCode: z.string().optional(),
  regNo: z.string().optional(),
  phone: z.string().optional(),
  fax: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  website: z.string().optional(),
  email: z.string().optional(),
  logoFileKey: z.string().min(1).nullable().optional(),
});

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const access = await requireBusinessAccess(req, id);
    assertCanManageBusiness(access.memberRole);
    const body = patchSchema.parse(await req.json());
    const existing = await prisma.businessProfile.findUniqueOrThrow({ where: { businessId: id } });
    if (body.logoFileKey !== undefined) {
      const nextKey = body.logoFileKey;
      const prevKey = existing.logoFileKey?.trim() || null;
      if (nextKey !== prevKey && prevKey) {
        await removeUploadFile(prevKey);
      }
    }
    const profile = await prisma.businessProfile.update({
      where: { businessId: id },
      data: body,
    });
    return jsonOk({ profile: serializeProfile(profile) });
  } catch (err) {
    return handleAuthRouteError(err, 'business.profile.patch');
  }
}
