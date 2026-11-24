import { z } from 'zod';

export const productSchema = z.object({
  id: z.string().min(1),
  accountingCode: z.string().min(1),
  name: z.string().min(1),
  code: z.string().min(1),
  type: z.enum(['goods', 'services']),
  categoryIds: z.array(z.string()),
  barcode: z.string().optional(),
  images: z.object({
    main: z.string().optional(),
    gallery: z.array(z.string()),
  }),
  salesDescription: z.string().optional(),
  purchaseDescription: z.string().optional(),
  prices: z.record(z.coerce.number()),
  purchasePrice: z.coerce.number(),
  units: z.object({
    main: z.string(),
    hasSecondary: z.boolean(),
    secondary: z.string().optional(),
    conversionFactor: z.coerce.number().optional(),
  }),
  inventory: z.object({
    trackStock: z.boolean(),
    reorderPoint: z.coerce.number(),
    minOrder: z.coerce.number(),
    leadTimeDays: z.coerce.number(),
  }),
  tax: z.object({
    hasSalesTax: z.boolean(),
    salesTaxRate: z.coerce.number(),
    hasPurchaseTax: z.boolean(),
    purchaseTaxRate: z.coerce.number(),
    taxType: z.string(),
    taxCode: z.string().optional(),
    taxUnit: z.string().optional(),
  }),
  status: z.enum(['active', 'inactive']),
});

export const productCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  parentId: z.string().optional(),
});

export const priceListSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tier: z.enum(['retail', 'wholesale', 'partner']).optional(),
});

export const saleInvoiceSchema = z.object({
  id: z.string().min(1),
  customerId: z.string(),
  date: z.string().min(1),
  status: z.enum(['draft', 'confirmed']),
  total: z.coerce.number(),
  kind: z.enum(['sale', 'return']),
  description: z.string().optional(),
});

export const incomeRecordSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: z.string().min(1),
  amount: z.coerce.number(),
  date: z.string().min(1),
});

export const installmentRecordSchema = z.object({
  id: z.string().min(1),
  customerId: z.string(),
  total: z.coerce.number(),
  paid: z.coerce.number(),
  nextDate: z.string().min(1),
});

export const productDiscountSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  mode: z.enum(['percent', 'amount']),
  value: z.coerce.number(),
  from: z.string(),
  to: z.string(),
});

export const purchaseLineSchema = z.object({
  id: z.string().min(1),
  itemId: z.string(),
  description: z.string(),
  quantity: z.coerce.number(),
  unitPrice: z.coerce.number(),
  discount: z.coerce.number(),
  tax: z.coerce.number(),
});

export const purchaseInvoiceSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['purchase', 'return']),
  number: z.string(),
  reference: z.string(),
  date: z.string().min(1),
  dueDate: z.string(),
  contactCode: z.string(),
  contactTitle: z.string(),
  project: z.string(),
  freight: z.coerce.number(),
  note: z.string(),
  status: z.enum(['draft', 'confirmed']),
  invoiceItems: z.array(purchaseLineSchema),
});

export const expenseRecordSchema = z.object({
  id: z.string().min(1),
  dateTime: z.string().min(1),
  description: z.string().min(1),
  amount: z.coerce.number(),
  type: z.literal('expense'),
  contactCode: z.string().optional(),
  bankCode: z.string().optional(),
  cashCode: z.string().optional(),
  pettyCashCode: z.string().optional(),
});

export const wasteRecordSchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  itemTitle: z.string().min(1),
  quantity: z.coerce.number(),
  reason: z.string(),
});

export const commerceModuleSchema = z.object({
  saleInvoices: z.array(saleInvoiceSchema),
  incomeTypes: z.array(z.string()),
  incomeRows: z.array(incomeRecordSchema),
  installments: z.array(installmentRecordSchema),
  productDiscounts: z.array(productDiscountSchema),
  purchaseInvoices: z.array(purchaseInvoiceSchema),
  expenses: z.array(expenseRecordSchema),
  wastes: z.array(wasteRecordSchema),
});

export const storeProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  cat: z.string(),
  price: z.string(),
  stock: z.string(),
  seo: z.string(),
  status: z.enum(['active', 'inactive']),
});

export const storeOrderSchema = z.object({
  id: z.string().min(1),
  customer: z.string().min(1),
  date: z.string().min(1),
  total: z.string(),
  status: z.string(),
});

export const storeModuleSchema = z.object({
  products: z.array(storeProductSchema),
  orders: z.array(storeOrderSchema),
  seo: z.object({
    title: z.string(),
    description: z.string(),
    keywords: z.string(),
  }),
  settings: z.object({
    shopName: z.string(),
    currency: z.string(),
    shippingNote: z.string(),
  }),
});

export const blogPostSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  author: z.string().min(1),
  date: z.string().min(1),
  views: z.string(),
  status: z.string(),
  category: z.string(),
});

export const blogCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  count: z.coerce.number(),
  slug: z.string().min(1),
});

export const blogCommentSchema = z.object({
  id: z.string().min(1),
  user: z.string().min(1),
  text: z.string().min(1),
  date: z.string().min(1),
  post: z.string().min(1),
  status: z.string(),
});

export const blogModuleSchema = z.object({
  posts: z.array(blogPostSchema),
  categories: z.array(blogCategorySchema),
  comments: z.array(blogCommentSchema),
  seo: z.object({
    title: z.string(),
    description: z.string(),
  }),
});

export const catalogModuleSchema = z.object({
  productCategories: z.array(productCategorySchema),
  priceLists: z.array(priceListSchema),
});
