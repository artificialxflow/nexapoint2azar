import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { deletePerson, PeopleNotFoundError, updatePerson } from '@/src/lib/erp/people-service';

type Ctx = { params: Promise<{ id: string; personId: string }> };

const patchSchema = z.object({
  person: z.unknown(),
});

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id, personId } = await ctx.params;
    await requireBusinessAccess(req, id);
    const body = patchSchema.parse(await req.json());
    const person = await updatePerson(id, personId, body.person);
    return jsonOk({ person });
  } catch (err) {
    if (err instanceof PeopleNotFoundError) {
      return jsonError('NOT_FOUND', err.message, 404);
    }
    return handleAuthRouteError(err, 'erp.people.patch');
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { id, personId } = await ctx.params;
    await requireBusinessAccess(req, id);
    await deletePerson(id, personId);
    return jsonOk({ deleted: true });
  } catch (err) {
    if (err instanceof PeopleNotFoundError) {
      return jsonError('NOT_FOUND', err.message, 404);
    }
    return handleAuthRouteError(err, 'erp.people.delete');
  }
}
