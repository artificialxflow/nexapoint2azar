import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import {
  moneyDocumentSchema,
  personCategorySchema,
  personGroupSchema,
  shareholderRecordSchema,
  vendorRecordSchema,
} from '@/src/lib/erp/person-zod';
import {
  getPeopleModule,
  PeopleModuleValidationError,
  savePeopleModule,
} from '@/src/lib/erp/people-service';
type Ctx = { params: Promise<{ id: string }> };

const moduleSchema = z.object({
  personCategories: z.array(personCategorySchema),
  personGroups: z.array(personGroupSchema),
  receipts: z.array(moneyDocumentSchema),
  payments: z.array(moneyDocumentSchema),
  shareholders: z.array(shareholderRecordSchema),
  vendors: z.array(vendorRecordSchema),
});

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const module = await getPeopleModule(id);
    return jsonOk(module);
  } catch (err) {
    return handleAuthRouteError(err, 'erp.people.module.get');
  }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const body = moduleSchema.parse(await req.json());
    const module = await savePeopleModule(id, body);
    return jsonOk(module);
  } catch (err) {
    if (err instanceof PeopleModuleValidationError) {
      return jsonError('VALIDATION', err.message, 400);
    }
    return handleAuthRouteError(err, 'erp.people.module.put');
  }
}
