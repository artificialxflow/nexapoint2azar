import { z } from 'zod';

const voucherItemSchema = z.object({
  id: z.string(),
  itemCode: z.string(),
  title: z.string(),
  requestedQty: z.number(),
  availableQty: z.number(),
  quantity: z.number(),
  unit: z.string(),
});

const voucherSchema = z.object({
  id: z.string(),
  number: z.string(),
  date: z.string(),
  status: z.string(),
  description: z.string(),
  type: z.enum(['issue', 'transfer']),
  warehouseReceiptStatus: z.enum(['pending', 'posted']),
  sourceInvoiceNumber: z.string(),
  sourceWarehouseId: z.string(),
  destinationWarehouseId: z.string(),
  items: z.array(voucherItemSchema),
});

const stocktakingRowSchema = z.object({
  id: z.string(),
  itemCode: z.string(),
  title: z.string(),
  systemQty: z.number(),
  countedQty: z.number(),
});

const stocktakingSessionSchema = z.object({
  id: z.string(),
  number: z.string(),
  warehouseId: z.string(),
  date: z.string(),
  rows: z.array(stocktakingRowSchema),
});

export const warehouseModuleSchema = z.object({
  vouchers: z.array(voucherSchema),
  stocktakingSessions: z.array(stocktakingSessionSchema),
});

const formulaRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  unit: z.string(),
  qty: z.number(),
  amount: z.number(),
});

const formulaSchema = z.object({
  id: z.string(),
  number: z.string(),
  date: z.string(),
  project: z.string(),
  status: z.enum(['draft', 'confirmed']),
  isActive: z.boolean(),
  productItemCode: z.string(),
  outputWarehouse: z.string(),
  description: z.string(),
  materials: z.array(formulaRowSchema),
  directLabor: z.array(formulaRowSchema),
  overhead: z.array(formulaRowSchema),
});

const customerOrderSchema = z.object({
  id: z.string(),
  customer: z.string(),
  items: z.string(),
  date: z.string(),
  status: z.string(),
  progress: z.number(),
  type: z.enum(['new', 'processing', 'completed']),
  amount: z.string().optional(),
});

const procurementRequestSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string(),
  requester: z.string(),
  date: z.string(),
  status: z.string(),
  priority: z.string(),
  description: z.string().optional(),
});

const productionOrderSchema = z.object({
  id: z.string(),
  number: z.string(),
  invoiceRef: z.string(),
  customer: z.string(),
  date: z.string(),
  priority: z.number(),
  status: z.string(),
  deliveryDate: z.string(),
  qtyPlanned: z.number(),
  qtyDone: z.number(),
});

const workOrderSchema = z.object({
  id: z.string(),
  number: z.string(),
  date: z.string(),
  status: z.string(),
  formulaId: z.string(),
  productTitle: z.string(),
  outputWarehouse: z.string(),
  customer: z.string(),
  description: z.string(),
});

export const productionModuleSchema = z.object({
  customerOrders: z.array(customerOrderSchema),
  procurementRequests: z.array(procurementRequestSchema),
  formulas: z.array(formulaSchema),
  productionOrders: z.array(productionOrderSchema),
  workOrders: z.array(workOrderSchema),
});
