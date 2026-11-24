import { NextRequest } from 'next/server';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);

    const [
      peopleCount,
      productsCount,
      commerceDocs,
      bankAccounts,
      cashboxes,
      crmLeads,
      crmOpportunities,
      crmVisits,
      orders,
      productionOrders,
      tickets,
      campaigns,
    ] = await Promise.all([
      prisma.person.count({ where: { businessId } }),
      prisma.catalogProduct.count({ where: { businessId } }),
      prisma.commerceDocument.findMany({ where: { businessId }, select: { kind: true, totalAmount: true, createdAt: true } }),
      prisma.bankAccount.findMany({ where: { businessId }, select: { bankName: true, balance: true } }),
      prisma.cashbox.findMany({ where: { businessId }, select: { name: true, balance: true } }),
      prisma.crmLead.findMany({ where: { businessId }, select: { source: true, status: true } }),
      prisma.crmOpportunity.findMany({ where: { businessId }, select: { amount: true, stageId: true } }),
      prisma.crmVisit.findMany({ where: { businessId }, select: { result: true, buyProbability: true } }),
      prisma.customerOrder.findMany({ where: { businessId }, select: { status: true, type: true, totalRial: true } }),
      prisma.productionOrder.findMany({ where: { businessId }, select: { status: true, qtyPlanned: true, qtyDone: true } }),
      prisma.afterSalesTicket.findMany({ where: { businessId }, select: { status: true, priority: true } }),
      prisma.marketingCampaign.findMany({ where: { businessId }, select: { name: true, budget: true, spent: true, leadsCount: true, conversionsCount: true } }),
    ]);

    let totalSales = 0;
    let totalPurchases = 0;
    let totalExpenses = 0;
    let totalIncome = 0;
    for (const d of commerceDocs) {
      if (d.kind === 'sale') totalSales += d.totalAmount;
      else if (d.kind === 'sale_return') totalSales -= d.totalAmount;
      else if (d.kind === 'purchase') totalPurchases += d.totalAmount;
      else if (d.kind === 'purchase_return') totalPurchases -= d.totalAmount;
      else if (d.kind === 'expense') totalExpenses += d.totalAmount;
      else if (d.kind === 'income') totalIncome += d.totalAmount;
    }

    const totalLiquidity =
      bankAccounts.reduce((s, a) => s + a.balance, 0) +
      cashboxes.reduce((s, c) => s + c.balance, 0);

    const leadSourceMap = new Map<string, number>();
    for (const l of crmLeads) {
      const k = l.source.trim() || 'نامشخص';
      leadSourceMap.set(k, (leadSourceMap.get(k) ?? 0) + 1);
    }

    const orderStatusMap = new Map<string, number>();
    for (const o of orders) {
      const k = o.status.trim() || 'نامشخص';
      orderStatusMap.set(k, (orderStatusMap.get(k) ?? 0) + 1);
    }

    return jsonOk({
      kpis: {
        peopleCount,
        productsCount,
        totalSales,
        totalPurchases,
        totalExpenses,
        totalIncome,
        netProfit: totalSales + totalIncome - totalPurchases - totalExpenses,
        totalLiquidity,
        crmLeadsCount: crmLeads.length,
        crmPipelineValue: crmOpportunities.reduce((s, o) => s + (o.amount ?? 0), 0),
        crmVisitsCount: crmVisits.length,
        ordersCount: orders.length,
        productionOrdersCount: productionOrders.length,
        openTicketsCount: tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length,
      },
      leadSources: [...leadSourceMap.entries()].map(([name, value]) => ({ name, value })),
      orderDistribution: [...orderStatusMap.entries()].map(([name, value]) => ({ name, value })),
      liquidityBreakdown: [
        ...bankAccounts.map((b) => ({ name: b.bankName, value: b.balance })),
        ...cashboxes.map((c) => ({ name: c.name, value: c.balance })),
      ],
      campaignPerformance: campaigns.map((c) => ({
        name: c.name,
        budget: c.budget,
        spent: c.spent,
        leads: c.leadsCount,
        conversions: c.conversionsCount,
      })),
    });
  } catch (err) {
    return handleAuthRouteError(err, 'reports.get');
  }
}
