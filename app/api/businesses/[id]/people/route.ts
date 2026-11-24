import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { personSchema } from '@/src/lib/erp/person-zod';
import { createPerson, listPeople, PeopleNotFoundError } from '@/src/lib/erp/people-service';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const people = await listPeople(id);
    return jsonOk({ people });
  } catch (err) {
    return handleAuthRouteError(err, 'erp.people.list');
  }
}

const createSchema = z.object({
  person: z.unknown(),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const body = createSchema.parse(await req.json());
    const person = await createPerson(id, body.person);
    return jsonOk({ person }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return handleAuthRouteError(err, 'erp.people.create');
    }
    return handleAuthRouteError(err, 'erp.people.create');
  }
}
