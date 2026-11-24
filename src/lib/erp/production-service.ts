import { prisma } from '@/src/lib/db/prisma';
import type { ProductionModulePayload, WarehouseModulePayload } from '@/src/types/production';
import { productionModuleSchema, warehouseModuleSchema } from '@/src/lib/erp/production-zod';

export class ProductionValidationError extends Error {
  code = 'VALIDATION';
  constructor(message: string) {
    super(message);
  }
}

export async function getWarehouseModule(businessId: string): Promise<WarehouseModulePayload> {
  const [vouchers, sessions] = await Promise.all([
    prisma.warehouseVoucher.findMany({
      where: { businessId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.stocktakingSession.findMany({
      where: { businessId },
      include: { rows: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    vouchers: vouchers.map((v) => ({
      id: v.id,
      number: v.number,
      date: v.date,
      status: v.status,
      description: v.description,
      type: v.type === 'transfer' ? 'transfer' : 'issue',
      warehouseReceiptStatus: v.warehouseReceiptStatus === 'posted' ? 'posted' : 'pending',
      sourceInvoiceNumber: v.sourceInvoiceNumber,
      sourceWarehouseId: v.sourceWarehouseId,
      destinationWarehouseId: v.destinationWarehouseId,
      items: v.items.map((it) => ({
        id: it.id,
        itemCode: it.itemCode,
        title: it.title,
        requestedQty: it.requestedQty,
        availableQty: it.availableQty,
        quantity: it.quantity,
        unit: it.unit,
      })),
    })),
    stocktakingSessions: sessions.map((s) => ({
      id: s.id,
      number: s.number,
      warehouseId: s.warehouseId,
      date: s.date,
      rows: s.rows.map((r) => ({
        id: r.id,
        itemCode: r.itemCode,
        title: r.title,
        systemQty: r.systemQty,
        countedQty: r.countedQty,
      })),
    })),
  };
}

export async function saveWarehouseModule(
  businessId: string,
  raw: WarehouseModulePayload
): Promise<WarehouseModulePayload> {
  const payload = warehouseModuleSchema.parse(raw);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${businessId} || ':warehouse'))`;
    await tx.warehouseVoucher.deleteMany({ where: { businessId } });
    await tx.stocktakingSession.deleteMany({ where: { businessId } });

    for (const v of payload.vouchers) {
      await tx.warehouseVoucher.create({
        data: {
          id: v.id,
          businessId,
          number: v.number,
          date: v.date,
          status: v.status,
          description: v.description,
          type: v.type,
          warehouseReceiptStatus: v.warehouseReceiptStatus,
          sourceInvoiceNumber: v.sourceInvoiceNumber,
          sourceWarehouseId: v.sourceWarehouseId,
          destinationWarehouseId: v.destinationWarehouseId,
          items: {
            create: v.items.map((it) => ({
              itemCode: it.itemCode,
              title: it.title,
              requestedQty: it.requestedQty,
              availableQty: it.availableQty,
              quantity: it.quantity,
              unit: it.unit,
            })),
          },
        },
      });
    }

    for (const s of payload.stocktakingSessions) {
      await tx.stocktakingSession.create({
        data: {
          id: s.id,
          businessId,
          number: s.number,
          warehouseId: s.warehouseId,
          date: s.date,
          rows: {
            create: s.rows.map((r) => ({
              itemCode: r.itemCode,
              title: r.title,
              systemQty: r.systemQty,
              countedQty: r.countedQty,
            })),
          },
        },
      });
    }
  });

  return getWarehouseModule(businessId);
}

export async function getProductionModule(businessId: string): Promise<ProductionModulePayload> {
  const [customerOrders, procurementRequests, formulas, productionOrders, workOrders] = await Promise.all([
    prisma.customerOrder.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } }),
    prisma.procurementRequest.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } }),
    prisma.productionFormula.findMany({
      where: { businessId },
      include: { rows: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.productionOrder.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } }),
    prisma.workOrder.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } }),
  ]);

  return {
    customerOrders: customerOrders.map((o) => ({
      id: o.orderNo || o.id,
      customer: o.customer,
      items: o.items,
      date: o.date,
      status: o.status,
      progress: o.progress,
      type: o.type === 'processing' || o.type === 'completed' ? o.type : 'new',
      amount: o.amount || undefined,
    })),
    procurementRequests: procurementRequests.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      requester: r.requester,
      date: r.date,
      status: r.status,
      priority: r.priority,
      description: r.description || undefined,
    })),
    formulas: formulas.map((f) => ({
      id: f.id,
      number: f.number,
      date: f.date,
      project: f.project,
      status: f.status === 'draft' ? 'draft' : 'confirmed',
      isActive: f.isActive,
      productItemCode: f.productItemCode,
      outputWarehouse: f.outputWarehouse,
      description: f.description,
      materials: f.rows
        .filter((r) => r.kind === 'material')
        .map((r) => ({ id: r.id, title: r.title, unit: r.unit, qty: r.qty, amount: r.amount })),
      directLabor: f.rows
        .filter((r) => r.kind === 'direct_labor')
        .map((r) => ({ id: r.id, title: r.title, unit: r.unit, qty: r.qty, amount: r.amount })),
      overhead: f.rows
        .filter((r) => r.kind === 'overhead')
        .map((r) => ({ id: r.id, title: r.title, unit: r.unit, qty: r.qty, amount: r.amount })),
    })),
    productionOrders: productionOrders.map((p) => ({
      id: p.id,
      number: p.number,
      invoiceRef: p.invoiceRef,
      customer: p.customer,
      date: p.date,
      priority: p.priority,
      status: p.status,
      deliveryDate: p.deliveryDate,
      qtyPlanned: p.qtyPlanned,
      qtyDone: p.qtyDone,
    })),
    workOrders: workOrders.map((w) => ({
      id: w.id,
      number: w.number,
      date: w.date,
      status: w.status,
      formulaId: w.formulaId,
      productTitle: w.productTitle,
      outputWarehouse: w.outputWarehouse,
      customer: w.customer,
      description: w.description,
    })),
  };
}

export async function saveProductionModule(
  businessId: string,
  raw: ProductionModulePayload
): Promise<ProductionModulePayload> {
  const payload = productionModuleSchema.parse(raw);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${businessId} || ':production'))`;
    await tx.customerOrder.deleteMany({ where: { businessId } });
    await tx.procurementRequest.deleteMany({ where: { businessId } });
    await tx.productionFormula.deleteMany({ where: { businessId } });
    await tx.productionOrder.deleteMany({ where: { businessId } });
    await tx.workOrder.deleteMany({ where: { businessId } });

    for (const o of payload.customerOrders) {
      await tx.customerOrder.create({
        data: {
          businessId,
          orderNo: o.id,
          customer: o.customer,
          items: o.items,
          date: o.date,
          status: o.status,
          progress: o.progress,
          type: o.type,
          amount: o.amount ?? '',
        },
      });
    }

    for (const r of payload.procurementRequests) {
      await tx.procurementRequest.create({
        data: {
          id: r.id,
          businessId,
          title: r.title,
          type: r.type,
          requester: r.requester,
          date: r.date,
          status: r.status,
          priority: r.priority,
          description: r.description ?? '',
        },
      });
    }

    for (const f of payload.formulas) {
      await tx.productionFormula.create({
        data: {
          id: f.id,
          businessId,
          number: f.number,
          date: f.date,
          project: f.project,
          status: f.status,
          isActive: f.isActive,
          productItemCode: f.productItemCode,
          outputWarehouse: f.outputWarehouse,
          description: f.description,
          rows: {
            create: [
              ...f.materials.map((m) => ({
                kind: 'material' as const,
                title: m.title,
                unit: m.unit,
                qty: m.qty,
                amount: m.amount,
              })),
              ...f.directLabor.map((m) => ({
                kind: 'direct_labor' as const,
                title: m.title,
                unit: m.unit,
                qty: m.qty,
                amount: m.amount,
              })),
              ...f.overhead.map((m) => ({
                kind: 'overhead' as const,
                title: m.title,
                unit: m.unit,
                qty: m.qty,
                amount: m.amount,
              })),
            ],
          },
        },
      });
    }

    for (const p of payload.productionOrders) {
      await tx.productionOrder.create({
        data: {
          id: p.id,
          businessId,
          number: p.number,
          invoiceRef: p.invoiceRef,
          customer: p.customer,
          date: p.date,
          priority: p.priority,
          status: p.status,
          deliveryDate: p.deliveryDate,
          qtyPlanned: p.qtyPlanned,
          qtyDone: p.qtyDone,
        },
      });
    }

    for (const w of payload.workOrders) {
      await tx.workOrder.create({
        data: {
          id: w.id,
          businessId,
          number: w.number,
          date: w.date,
          status: w.status,
          formulaId: w.formulaId,
          productTitle: w.productTitle,
          outputWarehouse: w.outputWarehouse,
          customer: w.customer,
          description: w.description,
        },
      });
    }
  });

  return getProductionModule(businessId);
}
