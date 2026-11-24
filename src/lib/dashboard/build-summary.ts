import { prisma } from '@/src/lib/db/prisma';
import { saleInvoiceSchema } from '@/src/lib/erp/commerce-zod';
import { moneyDocumentSchema } from '@/src/lib/erp/person-zod';
import type { DashboardSummary } from '@/src/lib/dashboard/types';
import { moneyToNumber } from '@/src/lib/money/decimal';
import type { Prisma } from '@prisma/client';

function sumMoneyDocLines(data: unknown, fallbackTotal: Prisma.Decimal | number): number {
  const parsed = moneyDocumentSchema.safeParse(data);
  if (!parsed.success) return moneyToNumber(fallbackTotal);
  return parsed.data.lines.reduce((acc, line) => acc + (Number(line.amount) || 0), 0);
}

function monthBucketKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabelFa(d: Date): string {
  try {
    return new Intl.DateTimeFormat('fa-IR', { month: 'long' }).format(d);
  } catch {
    return monthBucketKey(d);
  }
}

function buildLast6MonthBuckets(): { key: string; name: string; start: Date }[] {
  const now = new Date();
  const buckets: { key: string; name: string; start: Date }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: monthBucketKey(start), name: monthLabelFa(start), start });
  }
  return buckets;
}

function saleInvoiceMonthKey(data: unknown, fallback: Date): string {
  const parsed = saleInvoiceSchema.safeParse(data);
  if (parsed.success) {
    const raw = parsed.data.date.trim();
    const iso = Date.parse(raw);
    if (!Number.isNaN(iso)) return monthBucketKey(new Date(iso));
  }
  return monthBucketKey(fallback);
}

function saleInvoiceTotal(data: unknown): number {
  const parsed = saleInvoiceSchema.safeParse(data);
  if (!parsed.success) return 0;
  if (parsed.data.status !== 'confirmed') return 0;
  const sign = parsed.data.kind === 'return' ? -1 : 1;
  return sign * (Number(parsed.data.total) || 0);
}

function productionStatusFromOrders(
  orders: { status: string; type: string }[]
): DashboardSummary['productionStatus'] {
  if (orders.length === 0) return [];

  let producing = 0;
  let ready = 0;
  let delayed = 0;

  for (const o of orders) {
    const status = o.status ?? '';
    if (status.includes('تأخیر') || status.includes('تاخیر')) {
      delayed++;
    } else if (o.type === 'processing' || status.includes('تولید')) {
      producing++;
    } else if (status.includes('آماده') || status.includes('ارسال') || o.type === 'completed') {
      ready++;
    } else if (o.type === 'new') {
      ready++;
    } else {
      producing++;
    }
  }

  const total = orders.length;
  const pct = (n: number) => Math.round((n / total) * 100);
  return [
    { label: 'در حال تولید', value: pct(producing) },
    { label: 'آماده ارسال', value: pct(ready) },
    { label: 'تأخیر', value: pct(delayed) },
  ].filter((row) => row.value > 0);
}

export async function buildDashboardSummary(
  businessId: string,
  businessName: string
): Promise<DashboardSummary> {
  const [moneyRows, peopleCount, visits, saleDocs, customerOrders] = await Promise.all([
    prisma.moneyDocument.findMany({
      where: { businessId },
      select: { kind: true, totalAmount: true, data: true },
    }),
    prisma.person.count({ where: { businessId } }),
    prisma.crmVisit.findMany({
      where: { businessId },
      select: { visitedAt: true },
    }),
    prisma.commerceDocument.findMany({
      where: { businessId, kind: { in: ['sale', 'sale_return'] } },
      select: { kind: true, data: true, createdAt: true },
    }),
    prisma.customerOrder.findMany({
      where: { businessId },
      select: { status: true, type: true },
    }),
  ]);

  let receiptTotal = 0;
  let paymentTotal = 0;
  for (const row of moneyRows) {
    const sum = sumMoneyDocLines(row.data, row.totalAmount);
    if (row.kind === 'receipt') receiptTotal += sum;
    else paymentTotal += sum;
  }

  const buckets = buildLast6MonthBuckets();
  const visitCounts = new Map(buckets.map((b) => [b.key, 0]));
  const salesTotals = new Map(buckets.map((b) => [b.key, 0]));

  for (const v of visits) {
    const key = monthBucketKey(v.visitedAt);
    if (visitCounts.has(key)) visitCounts.set(key, (visitCounts.get(key) ?? 0) + 1);
  }

  for (const doc of saleDocs) {
    const key = saleInvoiceMonthKey(doc.data, doc.createdAt);
    const bucketKey = buckets.find((b) => b.key === key)?.key;
    const mapKey = bucketKey ?? monthBucketKey(doc.createdAt);
    if (!salesTotals.has(mapKey)) continue;
    salesTotals.set(mapKey, (salesTotals.get(mapKey) ?? 0) + saleInvoiceTotal(doc.data));
  }

  const chartData = buckets.map((b) => ({
    name: b.name,
    sales: Math.round((salesTotals.get(b.key) ?? 0) / 1_000_000),
    visits: visitCounts.get(b.key) ?? 0,
  }));

  const productionStatus = productionStatusFromOrders(customerOrders);

  return {
    businessName,
    stats: {
      receiptTotal,
      paymentTotal,
      peopleCount,
      avgDeliveryDays: null,
    },
    chartData,
    productionStatus,
  };
}
