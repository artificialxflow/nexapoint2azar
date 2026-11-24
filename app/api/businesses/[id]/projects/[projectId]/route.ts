import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess, assertCanManageBusiness } from '@/src/lib/business/access';
import { serializeProject } from '@/src/lib/settings/serialize';

type Ctx = { params: Promise<{ id: string; projectId: string }> };

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  isDefault: z.boolean().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id, projectId } = await ctx.params;
    const access = await requireBusinessAccess(req, id);
    assertCanManageBusiness(access.memberRole);
    const body = patchSchema.parse(await req.json());

    const existing = await prisma.businessProject.findFirst({
      where: { id: projectId, businessId: id },
    });
    if (!existing) throw new Error('NOT_FOUND');

    const project = await prisma.$transaction(async (tx) => {
      if (body.isDefault) {
        await tx.businessProject.updateMany({
          where: { businessId: id },
          data: { isDefault: false },
        });
      }
      return tx.businessProject.update({
        where: { id: projectId },
        data: {
          name: body.name?.trim(),
          isDefault: body.isDefault,
          active: body.active,
        },
      });
    });

    return jsonOk({ project: serializeProject(project) });
  } catch (err) {
    return handleAuthRouteError(err, 'business.projects.patch');
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { id, projectId } = await ctx.params;
    const access = await requireBusinessAccess(req, id);
    assertCanManageBusiness(access.memberRole);

    const existing = await prisma.businessProject.findFirst({
      where: { id: projectId, businessId: id },
    });
    if (!existing) throw new Error('NOT_FOUND');

    await prisma.businessProject.delete({ where: { id: projectId } });
    return jsonOk({ ok: true });
  } catch (err) {
    return handleAuthRouteError(err, 'business.projects.delete');
  }
}
