/**
 * Smoke test فاز ۳ — Zod schemas (npm run test:commerce-m3)
 */
import assert from 'node:assert/strict';
import { seedProducts } from '../src/catalog/catalogSeed';
import {
  blogModuleSchema,
  commerceModuleSchema,
  productSchema,
  storeModuleSchema,
} from '../src/lib/erp/commerce-zod';

for (const p of seedProducts) {
  productSchema.parse(p);
}

commerceModuleSchema.parse({
  saleInvoices: [
    {
      id: 'FAUX-M3-SAL-001',
      customerId: 'p1',
      date: '2026-11-01',
      status: 'confirmed',
      total: 1000,
      kind: 'sale',
    },
  ],
  incomeTypes: ['فروش نقدی'],
  incomeRows: [
    {
      id: 'FAUX-M3-INC-001',
      title: 'FAUX-M3-INCOME-test',
      type: 'فروش نقدی',
      amount: 500,
      date: '2026-11-01',
    },
  ],
  installments: [],
  productDiscounts: [],
  purchaseInvoices: [],
  expenses: [],
  wastes: [],
});

storeModuleSchema.parse({
  products: [
    {
      id: 'FAUX-M3-STR-001',
      name: 'FAUX-M3-STORE-PRODUCT',
      cat: 'مبلمان',
      price: '۱۰,۰۰۰,۰۰۰',
      stock: '5',
      seo: 'خوب',
      status: 'active',
    },
  ],
  orders: [],
  seo: { title: 'FAUX-M3-STORE-SEO', description: 'test', keywords: '' },
  settings: { shopName: 'FAUX-M3-SHOP', currency: 'تومان', shippingNote: '' },
});

blogModuleSchema.parse({
  posts: [
    {
      id: 'FAUX-M3-BLG-001',
      title: 'FAUX-M3-BLOG-POST',
      author: 'UAT',
      date: '1404/08/10',
      views: '0',
      status: 'منتشر شده',
      category: 'راهنمای خرید',
    },
  ],
  categories: [],
  comments: [],
  seo: { title: 'FAUX-M3-BLOG-SEO', description: '' },
});

assert.ok(true);
console.log('test:commerce-m3 OK');
