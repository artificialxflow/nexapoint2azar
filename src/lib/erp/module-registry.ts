/**
 * ERP modules ۸–۱۲ (انبار، سفارش، ledger، …) — wire به view-map پس از افزودن API هر ماژول.
 * فاز ۷–۸: people + warehouse API و wire UI (CatalogContext / Warehouse.tsx).
 */
export const ERP_MODULE_REGISTRY = [
  { id: 'people', phase: 7, apiReady: true, uiWired: true },
  { id: 'warehouse', phase: 8, apiReady: true, uiWired: true },
  { id: 'orders', phase: 9, apiReady: false, uiWired: false },
  { id: 'ledger', phase: 10, apiReady: false, uiWired: false },
  { id: 'banking', phase: 11, apiReady: false, uiWired: false },
  { id: 'automation', phase: 12, apiReady: false, uiWired: false },
] as const;
