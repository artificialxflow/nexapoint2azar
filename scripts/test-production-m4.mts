/**
 * Smoke test فاز ۴ — Zod schemas (npm run test:production-m4)
 */
import assert from 'node:assert/strict';
import { productionModuleSchema, warehouseModuleSchema } from '../src/lib/erp/production-zod';

warehouseModuleSchema.parse({
  vouchers: [
    {
      id: 'FAUX-M4-WV-001',
      number: '5001',
      date: '2026-11-01',
      status: 'draft',
      description: 'FAUX-M4-VOUCHER-test',
      type: 'issue',
      warehouseReceiptStatus: 'pending',
      sourceInvoiceNumber: '',
      sourceWarehouseId: 'w1',
      destinationWarehouseId: 'w2',
      items: [
        {
          id: 'vi-1',
          itemCode: 'ITEM-1',
          title: 'FAUX-M4-ITEM',
          requestedQty: 1,
          availableQty: 5,
          quantity: 1,
          unit: 'عدد',
        },
      ],
    },
  ],
  stocktakingSessions: [],
});

productionModuleSchema.parse({
  customerOrders: [
    {
      id: 'FAUX-M4-ORD-001',
      customer: 'FAUX-M4-CUSTOMER',
      items: 'FAUX-M4-ORDER-ITEMS',
      date: '1404/08/10',
      status: 'پیش‌فاکتور',
      progress: 0,
      type: 'new',
    },
  ],
  procurementRequests: [
    {
      id: 'FAUX-M4-REQ-001',
      title: 'FAUX-M4-PROCUREMENT',
      type: 'کالا',
      requester: 'UAT',
      date: '1404/08/10',
      status: 'در انتظار تایید',
      priority: 'medium',
    },
  ],
  formulas: [
    {
      id: 'FAUX-M4-F-001',
      number: '2001',
      date: '2026-11-01',
      project: 'FAUX-M4-PROJECT',
      status: 'draft',
      isActive: true,
      productItemCode: 'P1',
      outputWarehouse: 'انبار مرکزی',
      description: 'FAUX-M4-FORMULA',
      materials: [{ id: 'r1', title: 'ماده', unit: 'عدد', qty: 1, amount: 100 }],
      directLabor: [],
      overhead: [],
    },
  ],
  productionOrders: [],
  workOrders: [
    {
      id: 'FAUX-M4-WO-001',
      number: '3001',
      date: '2026-11-01',
      status: 'در انتظار',
      formulaId: 'FAUX-M4-F-001',
      productTitle: 'FAUX-M4-PRODUCT',
      outputWarehouse: 'انبار داخلی',
      customer: 'FAUX-M4-CUSTOMER',
      description: 'FAUX-M4-WORK-ORDER',
    },
  ],
});

assert.ok(true);
console.log('test:production-m4 OK');
