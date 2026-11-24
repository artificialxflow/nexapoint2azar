import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { moneyFromNumber, moneyToNumber } from '@/src/lib/money/decimal';
import { formatBusinessDateJalali, parseBusinessDateForDb } from '@/src/lib/dates/business-date';

function fmtDate(d: Date | null | undefined): string {
  return d ? formatBusinessDateJalali(d) : '';
}

const createSchema = z.discriminatedUnion('entity', [
  z.object({
    entity: z.literal('bank_account'),
    bankName: z.string().min(1),
    branchName: z.string().optional().default(''),
    accountNumber: z.string().optional().default(''),
    cardNumber: z.string().optional().default(''),
    iban: z.string().optional().default(''),
    currency: z.string().optional().default('تومان'),
    openingBalance: z.number().optional().default(0),
  }),
  z.object({
    entity: z.literal('cashbox'),
    name: z.string().min(1),
    keeperName: z.string().optional().default(''),
    currency: z.string().optional().default('تومان'),
    balance: z.number().optional().default(0),
  }),
  z.object({
    entity: z.literal('petty_cash'),
    title: z.string().min(1),
    holderName: z.string().optional().default(''),
    limitAmount: z.number().optional().default(0),
    balance: z.number().optional().default(0),
  }),
  z.object({
    entity: z.literal('transaction'),
    bankAccountId: z.string().optional().nullable(),
    cashboxId: z.string().optional().nullable(),
    pettyCashId: z.string().optional().nullable(),
    type: z.enum(['deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'fee']),
    amount: z.number().positive(),
    date: z.string().optional().default(''),
    counterpartyName: z.string().optional().default(''),
    referenceNo: z.string().optional().default(''),
    description: z.string().optional().default(''),
  }),
  z.object({
    entity: z.literal('transfer'),
    fromSource: z.string().min(1),
    toTarget: z.string().min(1),
    amount: z.number().positive(),
    fee: z.number().min(0).optional().default(0),
    date: z.string().optional().default(''),
    referenceNo: z.string().optional().default(''),
    description: z.string().optional().default(''),
  }),
  z.object({
    entity: z.literal('check'),
    bankAccountId: z.string().optional().nullable(),
    direction: z.enum(['receivable', 'payable']),
    checkNo: z.string().min(1),
    sayadId: z.string().optional().default(''),
    bankName: z.string().optional().default(''),
    counterparty: z.string().optional().default(''),
    amount: z.number().positive(),
    issueDate: z.string().optional().default(''),
    dueDate: z.string().optional().default(''),
    status: z.enum(['pending', 'cleared', 'bounced', 'endorsed', 'cancelled']).optional().default('pending'),
    notes: z.string().optional().default(''),
  }),
]);

const patchSchema = z.object({
  entity: z.enum(['bank_account', 'cashbox', 'petty_cash', 'check']),
  id: z.string().min(1),
  status: z.enum(['pending', 'cleared', 'bounced', 'endorsed', 'cancelled']).optional(),
  isActive: z.boolean().optional(),
  balance: z.number().optional(),
  notes: z.string().optional(),
});

const deleteSchema = z.object({
  entity: z.enum(['bank_account', 'cashbox', 'petty_cash', 'transaction', 'transfer', 'check']),
  id: z.string().min(1),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);

    const [bankAccounts, cashboxes, pettyCashes, transactions, transfers, checks] = await Promise.all([
      prisma.bankAccount.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } }),
      prisma.cashbox.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } }),
      prisma.pettyCash.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } }),
      prisma.bankTransaction.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' }, take: 200 }),
      prisma.fundTransfer.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.checkItem.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' }, take: 200 }),
    ]);

    const totalBankBalance = bankAccounts.reduce((s, a) => s + moneyToNumber(a.balance), 0);
    const totalCashBalance = cashboxes.reduce((s, c) => s + moneyToNumber(c.balance), 0);
    const totalPettyCash = pettyCashes.reduce((s, p) => s + moneyToNumber(p.balance), 0);
    const pendingReceivableChecks = checks
      .filter((c) => c.direction === 'receivable' && c.status === 'pending')
      .reduce((s, c) => s + moneyToNumber(c.amount), 0);
    const pendingPayableChecks = checks
      .filter((c) => c.direction === 'payable' && c.status === 'pending')
      .reduce((s, c) => s + moneyToNumber(c.amount), 0);

    const mapAccount = (a: (typeof bankAccounts)[number]) => ({
      ...a,
      openingBalance: moneyToNumber(a.openingBalance),
      balance: moneyToNumber(a.balance),
    });
    const mapCash = (c: (typeof cashboxes)[number]) => ({
      ...c,
      balance: moneyToNumber(c.balance),
    });
    const mapPetty = (p: (typeof pettyCashes)[number]) => ({
      ...p,
      limitAmount: moneyToNumber(p.limitAmount),
      balance: moneyToNumber(p.balance),
    });
    const mapTx = (t: (typeof transactions)[number]) => ({
      ...t,
      date: fmtDate(t.date),
      amount: moneyToNumber(t.amount),
    });
    const mapTransfer = (t: (typeof transfers)[number]) => ({
      ...t,
      date: fmtDate(t.date),
      amount: moneyToNumber(t.amount),
      fee: moneyToNumber(t.fee),
    });
    const mapCheck = (c: (typeof checks)[number]) => ({
      ...c,
      issueDate: fmtDate(c.issueDate),
      dueDate: fmtDate(c.dueDate),
      amount: moneyToNumber(c.amount),
    });

    return jsonOk({
      bankAccounts: bankAccounts.map(mapAccount),
      cashboxes: cashboxes.map(mapCash),
      pettyCashes: pettyCashes.map(mapPetty),
      transactions: transactions.map(mapTx),
      transfers: transfers.map(mapTransfer),
      checks: checks.map(mapCheck),
      summary: {
        totalBankBalance,
        totalCashBalance,
        totalPettyCash,
        totalLiquidity: totalBankBalance + totalCashBalance + totalPettyCash,
        pendingReceivableChecks,
        pendingPayableChecks,
      },
    });
  } catch (err) {
    return handleAuthRouteError(err, 'banking.get');
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = createSchema.parse(await req.json());

    if (body.entity === 'bank_account') {
      const created = await prisma.bankAccount.create({
        data: {
          businessId,
          bankName: body.bankName,
          branchName: body.branchName,
          accountNumber: body.accountNumber,
          cardNumber: body.cardNumber,
          iban: body.iban,
          currency: body.currency,
          openingBalance: moneyFromNumber(body.openingBalance),
          balance: moneyFromNumber(body.openingBalance),
        },
      });
      return jsonOk(created, { status: 201 });
    }

    if (body.entity === 'cashbox') {
      const created = await prisma.cashbox.create({
        data: {
          businessId,
          name: body.name,
          keeperName: body.keeperName,
          currency: body.currency,
          balance: moneyFromNumber(body.balance),
        },
      });
      return jsonOk(created, { status: 201 });
    }

    if (body.entity === 'petty_cash') {
      const created = await prisma.pettyCash.create({
        data: {
          businessId,
          title: body.title,
          holderName: body.holderName,
          limitAmount: moneyFromNumber(body.limitAmount),
          balance: moneyFromNumber(body.balance),
        },
      });
      return jsonOk(created, { status: 201 });
    }

    if (body.entity === 'transaction') {
      const deltaN = body.type === 'deposit' || body.type === 'transfer_in' ? body.amount : -body.amount;
      const delta = moneyFromNumber(deltaN);
      const created = await prisma.$transaction(async (tx) => {
        const record = await tx.bankTransaction.create({
          data: {
            businessId,
            bankAccountId: body.bankAccountId ?? null,
            cashboxId: body.cashboxId ?? null,
            pettyCashId: body.pettyCashId ?? null,
            type: body.type,
            amount: moneyFromNumber(body.amount),
            date: parseBusinessDateForDb(body.date),
            counterpartyName: body.counterpartyName,
            referenceNo: body.referenceNo,
            description: body.description,
          },
        });
        if (body.bankAccountId) {
          await tx.bankAccount.updateMany({
            where: { id: body.bankAccountId, businessId },
            data: { balance: { increment: delta } },
          });
        } else if (body.cashboxId) {
          await tx.cashbox.updateMany({
            where: { id: body.cashboxId, businessId },
            data: { balance: { increment: delta } },
          });
        } else if (body.pettyCashId) {
          await tx.pettyCash.updateMany({
            where: { id: body.pettyCashId, businessId },
            data: { balance: { increment: delta } },
          });
        }
        return record;
      });
      return jsonOk(created, { status: 201 });
    }

    if (body.entity === 'transfer') {
      const created = await prisma.fundTransfer.create({
        data: {
          businessId,
          fromSource: body.fromSource,
          toTarget: body.toTarget,
          amount: moneyFromNumber(body.amount),
          fee: moneyFromNumber(body.fee),
          date: parseBusinessDateForDb(body.date),
          referenceNo: body.referenceNo,
          description: body.description,
        },
      });
      return jsonOk(created, { status: 201 });
    }

    const created = await prisma.checkItem.create({
      data: {
        businessId,
        bankAccountId: body.bankAccountId ?? null,
        direction: body.direction,
        checkNo: body.checkNo,
        sayadId: body.sayadId,
        bankName: body.bankName,
        counterparty: body.counterparty,
        amount: moneyFromNumber(body.amount),
        issueDate: parseBusinessDateForDb(body.issueDate),
        dueDate: parseBusinessDateForDb(body.dueDate),
        status: body.status,
        notes: body.notes,
      },
    });
    return jsonOk(created, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'banking.post');
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = patchSchema.parse(await req.json());

    if (body.entity === 'check') {
      const res = await prisma.checkItem.updateMany({
        where: { id: body.id, businessId },
        data: {
          ...(body.status !== undefined ? { status: body.status } : {}),
          ...(body.notes !== undefined ? { notes: body.notes } : {}),
        },
      });
      if (res.count === 0) return jsonError('NOT_FOUND', 'چک یافت نشد.', 404);
      return jsonOk({ updated: true });
    }

    if (body.entity === 'bank_account') {
      const res = await prisma.bankAccount.updateMany({
        where: { id: body.id, businessId },
        data: {
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
          ...(body.balance !== undefined ? { balance: moneyFromNumber(body.balance) } : {}),
        },
      });
      if (res.count === 0) return jsonError('NOT_FOUND', 'حساب یافت نشد.', 404);
      return jsonOk({ updated: true });
    }

    if (body.entity === 'cashbox') {
      const res = await prisma.cashbox.updateMany({
        where: { id: body.id, businessId },
        data: {
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
          ...(body.balance !== undefined ? { balance: moneyFromNumber(body.balance) } : {}),
        },
      });
      if (res.count === 0) return jsonError('NOT_FOUND', 'صندوق یافت نشد.', 404);
      return jsonOk({ updated: true });
    }

    const res = await prisma.pettyCash.updateMany({
      where: { id: body.id, businessId },
      data: {
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.balance !== undefined ? { balance: body.balance } : {}),
      },
    });
    if (res.count === 0) return jsonError('NOT_FOUND', 'تنخواه یافت نشد.', 404);
    return jsonOk({ updated: true });
  } catch (err) {
    return handleAuthRouteError(err, 'banking.patch');
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = deleteSchema.parse(await req.json());

    const map = {
      bank_account: () => prisma.bankAccount.deleteMany({ where: { id: body.id, businessId } }),
      cashbox: () => prisma.cashbox.deleteMany({ where: { id: body.id, businessId } }),
      petty_cash: () => prisma.pettyCash.deleteMany({ where: { id: body.id, businessId } }),
      transaction: () => prisma.bankTransaction.deleteMany({ where: { id: body.id, businessId } }),
      transfer: () => prisma.fundTransfer.deleteMany({ where: { id: body.id, businessId } }),
      check: () => prisma.checkItem.deleteMany({ where: { id: body.id, businessId } }),
    };

    const res = await map[body.entity]();
    if (res.count === 0) return jsonError('NOT_FOUND', 'مورد یافت نشد.', 404);
    return jsonOk({ deleted: true });
  } catch (err) {
    return handleAuthRouteError(err, 'banking.delete');
  }
}
