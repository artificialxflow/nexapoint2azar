export type WarehouseVoucherType = 'issue' | 'transfer';

export interface WarehouseVoucherItemRecord {
  id: string;
  itemCode: string;
  title: string;
  requestedQty: number;
  availableQty: number;
  quantity: number;
  unit: string;
}

export interface WarehouseVoucherRecord {
  id: string;
  number: string;
  date: string;
  status: string;
  description: string;
  type: WarehouseVoucherType;
  warehouseReceiptStatus: 'pending' | 'posted';
  sourceInvoiceNumber: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  items: WarehouseVoucherItemRecord[];
}

export interface StocktakingRowRecord {
  id: string;
  itemCode: string;
  title: string;
  systemQty: number;
  countedQty: number;
}

export interface StocktakingSessionRecord {
  id: string;
  number: string;
  warehouseId: string;
  date: string;
  rows: StocktakingRowRecord[];
}

export interface WarehouseModulePayload {
  vouchers: WarehouseVoucherRecord[];
  stocktakingSessions: StocktakingSessionRecord[];
}

export interface CustomerOrderRecord {
  id: string;
  customer: string;
  items: string;
  date: string;
  status: string;
  progress: number;
  type: 'new' | 'processing' | 'completed';
  amount?: string;
}

export interface ProcurementRequestRecord {
  id: string;
  title: string;
  type: string;
  requester: string;
  date: string;
  status: string;
  priority: string;
  description?: string;
}

export interface ProductionFormulaRowRecord {
  id: string;
  title: string;
  unit: string;
  qty: number;
  amount: number;
}

export interface ProductionFormulaRecord {
  id: string;
  number: string;
  date: string;
  project: string;
  status: 'draft' | 'confirmed';
  isActive: boolean;
  productItemCode: string;
  outputWarehouse: string;
  description: string;
  materials: ProductionFormulaRowRecord[];
  directLabor: ProductionFormulaRowRecord[];
  overhead: ProductionFormulaRowRecord[];
}

export interface ProductionOrderRecord {
  id: string;
  number: string;
  invoiceRef: string;
  customer: string;
  date: string;
  priority: number;
  status: string;
  deliveryDate: string;
  qtyPlanned: number;
  qtyDone: number;
}

export interface WorkOrderRecord {
  id: string;
  number: string;
  date: string;
  status: string;
  formulaId: string;
  productTitle: string;
  outputWarehouse: string;
  customer: string;
  description: string;
}

export interface ProductionModulePayload {
  customerOrders: CustomerOrderRecord[];
  procurementRequests: ProcurementRequestRecord[];
  formulas: ProductionFormulaRecord[];
  productionOrders: ProductionOrderRecord[];
  workOrders: WorkOrderRecord[];
}
