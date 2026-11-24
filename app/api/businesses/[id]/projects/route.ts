import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess, assertCanManageBusiness } from '@/src/lib/business/access';
import { serializeProject } from '@/src/lib/settings/serialize';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const rows = await prisma.businessProject.findMany({
      where: { businessId: id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    return jsonOk({ projects: rows.map(serializeProject) });
  } catch (err) {
    return handleAuthRouteError(err, 'business.projects.list');
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  isDefault: z.boolean().optional(),
  active: z.boolean().optional(),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const access = await requireBusinessAccess(req, id);
    assertCanManageBusiness(access.memberRole);
    const body = createSchema.parse(await req.json());

    const project = await prisma.$transaction(async (tx) => {
      if (body.isDefault) {
        await tx.businessProject.updateMany({
          where: { businessId: id },
          data: { isDefault: false },
        });
      }
      return tx.businessProject.create({
        data: {
          businessId: id,
          name: body.name.trim(),
          isDefault: body.isDefault ?? false,
          active: body.active ?? true,
        },
      });
    });

    return jsonOk({ project: serializeProject(project) }, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'business.projects.create');
  }
}
