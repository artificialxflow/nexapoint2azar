import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';

const createSchema = z.discriminatedUnion('entity', [
  z.object({
    entity: z.literal('account'),
    code: z.string().min(1),
    name: z.string().min(1),
    type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
    parentCode: z.string().optional().default(''),
    balance: z.number().optional().default(0),
  }),
  z.object({
    entity: z.literal('journal'),
    entryNo: z.string().optional().default(''),
    date: z.string().min(1),
    description: z.string().min(1),
    fiscalYearId: z.string().optional().nullable(),
    status: z.enum(['draft', 'posted']).optional().default('posted'),
    lines: z
      .array(
        z.object({
          accountId: z.string().min(1),
          description: z.string().optional().default(''),
          debit: z.number().min(0).default(0),
          credit: z.number().min(0).default(0),
        })
      )
      .min(2),
  }),
]);

const deleteSchema = z.object({
  entity: z.enum(['account', 'journal']),
  id: z.string().min(1),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);

    const [accounts, journals] = await Promise.all([
      prisma.accountingAccount.findMany({
        where: { businessId },
        orderBy: [{ code: 'asc' }],
      }),
      prisma.journalEntry.findMany({
        where: { businessId },
        include: {
          lines: {
            include: { account: { select: { id: true, code: true, name: true, type: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    const debitByAccount = new Map<string, number>();
    const creditByAccount = new Map<string, number>();
    for (const j of journals) {
      if (j.status === 'cancelled') continue;
      for (const l of j.lines) {
        debitByAccount.set(l.accountId, (debitByAccount.get(l.accountId) ?? 0) + l.debit);
        creditByAccount.set(l.accountId, (creditByAccount.get(l.accountId) ?? 0) + l.credit);
      }
    }

    const trialBalance = accounts.map((acc) => {
      const debit = debitByAccount.get(acc.id) ?? 0;
      const credit = creditByAccount.get(acc.id) ?? 0;
      return {
        accountId: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        debit,
        credit,
        netBalance: acc.balance + debit - credit,
      };
    });

    const totalDebit = trialBalance.reduce((s, r) => s + r.debit, 0);
    const totalCredit = trialBalance.reduce((s, r) => s + r.credit, 0);

    return jsonOk({
      accounts,
      journals,
      trialBalance,
      summary: {
        accountsCount: accounts.length,
        journalsCount: journals.length,
        totalDebit,
        totalCredit,
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
      },
    });
  } catch (err) {
    return handleAuthRouteError(err, 'accounting.get');
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = createSchema.parse(await req.json());

    if (body.entity === 'account') {
      const created = await prisma.accountingAccount.create({
        data: {
          businessId,
          code: body.code.trim(),
          name: body.name.trim(),
          type: body.type,
          parentCode: body.parentCode,
          balance: body.balance,
        },
      });
      return jsonOk(created, { status: 201 });
    }

    const totalDebit = body.lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = body.lines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return jsonError('UNBALANCED_JOURNAL', 'جمع بدهکار و بستانکار سند باید برابر باشد.', 400);
    }

    const count = await prisma.journalEntry.count({ where: { businessId } });
    const entryNo = body.entryNo.trim() || `DOC-${1001 + count}`;

    const created = await prisma.journalEntry.create({
      data: {
        businessId,
        fiscalYearId: body.fiscalYearId ?? null,
        entryNo,
        date: body.date,
        description: body.description,
        status: body.status,
        totalDebit,
        totalCredit,
        lines: {
          create: body.lines.map((l) => ({
            accountId: l.accountId,
            description: l.description,
            debit: l.debit,
            credit: l.credit,
          })),
        },
      },
      include: {
        lines: { include: { account: { select: { id: true, code: true, name: true, type: true } } } },
      },
    });
    return jsonOk(created, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'accounting.post');
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = deleteSchema.parse(await req.json());

    if (body.entity === 'account') {
      const res = await prisma.accountingAccount.deleteMany({ where: { id: body.id, businessId } });
      if (res.count === 0) return jsonError('NOT_FOUND', 'حساب یافت نشد.', 404);
      return jsonOk({ deleted: true });
    }

    const res = await prisma.journalEntry.deleteMany({ where: { id: body.id, businessId } });
    if (res.count === 0) return jsonError('NOT_FOUND', 'سند یافت نشد.', 404);
    return jsonOk({ deleted: true });
  } catch (err) {
    return handleAuthRouteError(err, 'accounting.delete');
  }
}
