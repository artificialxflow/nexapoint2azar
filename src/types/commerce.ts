export type SaleInvoiceKind = 'sale' | 'return';

export interface SaleInvoiceRecord {
  id: string;
  customerId: string;
  date: string;
  status: 'draft' | 'confirmed';
  total: number;
  kind: SaleInvoiceKind;
  /** snapshot optional fields for audit */
  description?: string;
}

export interface IncomeRecord {
  id: string;
  title: string;
  type: string;
  amount: number;
  date: string;
}

export interface InstallmentRecord {
  id: string;
  customerId: string;
  total: number;
  paid: number;
  nextDate: string;
}

export interface ProductDiscountRecord {
  id: string;
  productId: string;
  mode: 'percent' | 'amount';
  value: number;
  from: string;
  to: string;
}

export interface PurchaseLineRecord {
  id: string;
  itemId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
}

export interface PurchaseInvoiceRecord {
  id: string;
  kind: 'purchase' | 'return';
  number: string;
  reference: string;
  date: string;
  dueDate: string;
  contactCode: string;
  contactTitle: string;
  project: string;
  freight: number;
  note: string;
  status: 'draft' | 'confirmed';
  invoiceItems: PurchaseLineRecord[];
}

export interface ExpenseRecord {
  id: string;
  dateTime: string;
  description: string;
  amount: number;
  type: 'expense';
  contactCode?: string;
  bankCode?: string;
  cashCode?: string;
  pettyCashCode?: string;
}

export interface WasteRecord {
  id: string;
  date: string;
  itemTitle: string;
  quantity: number;
  reason: string;
}

export interface StoreProductRecord {
  id: string;
  name: string;
  cat: string;
  price: string;
  stock: string;
  seo: string;
  status: 'active' | 'inactive';
  catalogProductId?: string;
}

export interface StoreOrderRecord {
  id: string;
  customer: string;
  date: string;
  total: string;
  status: string;
}

export interface StoreModulePayload {
  products: StoreProductRecord[];
  orders: StoreOrderRecord[];
  seo: {
    title: string;
    description: string;
    keywords: string;
  };
  settings: {
    shopName: string;
    currency: string;
    shippingNote: string;
  };
}

export interface BlogPostRecord {
  id: string;
  title: string;
  author: string;
  date: string;
  views: string;
  status: string;
  category: string;
}

export interface BlogCategoryRecord {
  id: string;
  name: string;
  count: number;
  slug: string;
}

export interface BlogCommentRecord {
  id: string;
  user: string;
  text: string;
  date: string;
  post: string;
  status: string;
}

export interface BlogModulePayload {
  posts: BlogPostRecord[];
  categories: BlogCategoryRecord[];
  comments: BlogCommentRecord[];
  seo: {
    title: string;
    description: string;
  };
}

export interface CommerceModulePayload {
  saleInvoices: SaleInvoiceRecord[];
  incomeTypes: string[];
  incomeRows: IncomeRecord[];
  installments: InstallmentRecord[];
  productDiscounts: ProductDiscountRecord[];
  purchaseInvoices: PurchaseInvoiceRecord[];
  expenses: ExpenseRecord[];
  wastes: WasteRecord[];
}
