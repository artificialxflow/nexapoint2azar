import { NextRequest } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { rateFromNumber, rateToNumber } from '@/src/lib/money/decimal';

const createSchema = z.discriminatedUnion('entity', [
  z.object({
    entity: z.literal('exchange_rate'),
    code: z.string().min(1),
    nameFa: z.string().min(1),
    rateToRial: z.number().min(0),
    effectiveAt: z.string().optional().default(''),
    active: z.boolean().optional().default(true),
  }),
  z.object({
    entity: z.literal('form_template'),
    module: z.string().optional().default('general'),
    name: z.string().min(1),
    description: z.string().optional().default(''),
    fields: z.array(z.unknown()).optional().default([]),
    isActive: z.boolean().optional().default(true),
  }),
  z.object({
    entity: z.literal('notification_rule'),
    eventKey: z.string().min(1),
    titleFa: z.string().min(1),
    inApp: z.boolean().optional().default(true),
    sms: z.boolean().optional().default(false),
    email: z.boolean().optional().default(false),
    active: z.boolean().optional().default(true),
  }),
  z.object({
    entity: z.literal('picklist_item'),
    groupKey: z.string().min(1),
    code: z.string().optional().default(''),
    label: z.string().min(1),
    color: z.string().optional().default(''),
    sortOrder: z.number().int().optional().default(0),
    active: z.boolean().optional().default(true),
  }),
]);

const patchSchema = z.object({
  entity: z.enum(['exchange_rate', 'form_template', 'notification_rule', 'picklist_item']),
  id: z.string().min(1),
  data: z.record(z.unknown()),
});

const deleteSchema = z.object({
  entity: z.enum(['exchange_rate', 'form_template', 'notification_rule', 'picklist_item']),
  id: z.string().min(1),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);

    const [exchangeRates, formTemplates, notificationRules, picklistItems] = await Promise.all([
      prisma.exchangeRate.findMany({ where: { businessId }, orderBy: { code: 'asc' } }),
      prisma.formTemplate.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } }),
      prisma.notificationRule.findMany({ where: { businessId }, orderBy: { eventKey: 'asc' } }),
      prisma.picklistItem.findMany({ where: { businessId }, orderBy: [{ groupKey: 'asc' }, { sortOrder: 'asc' }] }),
    ]);

    return jsonOk({
      exchangeRates: exchangeRates.map((r) => ({
        ...r,
        rateToRial: rateToNumber(r.rateToRial),
      })),
      formTemplates: formTemplates.map((t) => ({
        ...t,
        fields: Array.isArray(t.fieldsJson) ? t.fieldsJson : [],
      })),
      notificationRules,
      picklistItems,
    });
  } catch (err) {
    return handleAuthRouteError(err, 'settings.get');
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = createSchema.parse(await req.json());

    if (body.entity === 'exchange_rate') {
      const created = await prisma.exchangeRate.upsert({
        where: { businessId_code: { businessId, code: body.code.trim().toUpperCase() } },
        create: {
          businessId,
          code: body.code.trim().toUpperCase(),
          nameFa: body.nameFa,
          rateToRial: rateFromNumber(body.rateToRial),
          effectiveAt: body.effectiveAt,
          active: body.active,
        },
        update: {
          nameFa: body.nameFa,
          rateToRial: rateFromNumber(body.rateToRial),
          effectiveAt: body.effectiveAt,
          active: body.active,
        },
      });
      return jsonOk(created, { status: 201 });
    }

    if (body.entity === 'form_template') {
      const created = await prisma.formTemplate.create({
        data: {
          businessId,
          module: body.module,
          name: body.name,
          description: body.description,
          fieldsJson: body.fields as Prisma.InputJsonValue,
          isActive: body.isActive,
        },
      });
      return jsonOk(created, { status: 201 });
    }

    if (body.entity === 'notification_rule') {
      const created = await prisma.notificationRule.upsert({
        where: { businessId_eventKey: { businessId, eventKey: body.eventKey } },
        create: {
          businessId,
          eventKey: body.eventKey,
          titleFa: body.titleFa,
          inApp: body.inApp,
          sms: body.sms,
          email: body.email,
          active: body.active,
        },
        update: {
          titleFa: body.titleFa,
          inApp: body.inApp,
          sms: body.sms,
          email: body.email,
          active: body.active,
        },
      });
      return jsonOk(created, { status: 201 });
    }

    const created = await prisma.picklistItem.create({
      data: {
        businessId,
        groupKey: body.groupKey,
        code: body.code,
        label: body.label,
        color: body.color,
        sortOrder: body.sortOrder,
        active: body.active,
      },
    });
    return jsonOk(created, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'settings.post');
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = patchSchema.parse(await req.json());

    if (body.entity === 'exchange_rate') {
      const res = await prisma.exchangeRate.updateMany({
        where: { id: body.id, businessId },
        data: {
          ...(typeof body.data.nameFa === 'string' ? { nameFa: body.data.nameFa } : {}),
          ...(typeof body.data.rateToRial === 'number'
            ? { rateToRial: rateFromNumber(body.data.rateToRial) }
            : {}),
          ...(typeof body.data.effectiveAt === 'string' ? { effectiveAt: body.data.effectiveAt } : {}),
          ...(typeof body.data.active === 'boolean' ? { active: body.data.active } : {}),
        },
      });
      if (res.count === 0) return jsonError('NOT_FOUND', 'نرخ ارز یافت نشد.', 404);
      return jsonOk({ updated: true });
    }

    if (body.entity === 'form_template') {
      const res = await prisma.formTemplate.updateMany({
        where: { id: body.id, businessId },
        data: {
          ...(typeof body.data.name === 'string' ? { name: body.data.name } : {}),
          ...(typeof body.data.description === 'string' ? { description: body.data.description } : {}),
          ...(Array.isArray(body.data.fields) ? { fieldsJson: body.data.fields as Prisma.InputJsonValue } : {}),
          ...(typeof body.data.isActive === 'boolean' ? { isActive: body.data.isActive } : {}),
        },
      });
      if (res.count === 0) return jsonError('NOT_FOUND', 'فرم یافت نشد.', 404);
      return jsonOk({ updated: true });
    }

    if (body.entity === 'notification_rule') {
      const res = await prisma.notificationRule.updateMany({
        where: { id: body.id, businessId },
        data: {
          ...(typeof body.data.inApp === 'boolean' ? { inApp: body.data.inApp } : {}),
          ...(typeof body.data.sms === 'boolean' ? { sms: body.data.sms } : {}),
          ...(typeof body.data.email === 'boolean' ? { email: body.data.email } : {}),
          ...(typeof body.data.active === 'boolean' ? { active: body.data.active } : {}),
        },
      });
      if (res.count === 0) return jsonError('NOT_FOUND', 'تنظیم اعلان یافت نشد.', 404);
      return jsonOk({ updated: true });
    }

    const res = await prisma.picklistItem.updateMany({
      where: { id: body.id, businessId },
      data: {
        ...(typeof body.data.label === 'string' ? { label: body.data.label } : {}),
        ...(typeof body.data.color === 'string' ? { color: body.data.color } : {}),
        ...(typeof body.data.active === 'boolean' ? { active: body.data.active } : {}),
      },
    });
    if (res.count === 0) return jsonError('NOT_FOUND', 'آیتم فهرست یافت نشد.', 404);
    return jsonOk({ updated: true });
  } catch (err) {
    return handleAuthRouteError(err, 'settings.patch');
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = deleteSchema.parse(await req.json());

    const map = {
      exchange_rate: () => prisma.exchangeRate.deleteMany({ where: { id: body.id, businessId } }),
      form_template: () => prisma.formTemplate.deleteMany({ where: { id: body.id, businessId } }),
      notification_rule: () => prisma.notificationRule.deleteMany({ where: { id: body.id, businessId } }),
      picklist_item: () => prisma.picklistItem.deleteMany({ where: { id: body.id, businessId } }),
    };

    const res = await map[body.entity]();
    if (res.count === 0) return jsonError('NOT_FOUND', 'مورد یافت نشد.', 404);
    return jsonOk({ deleted: true });
  } catch (err) {
    return handleAuthRouteError(err, 'settings.delete');
  }
}
