/**
 * DB smoke: save commerce/store/blog/catalog modules (npm run test:commerce-module-db)
 * Requires DATABASE_URL and at least one Business row.
 */
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db/prisma';
import {
  getCommerceModule,
  saveBlogModule,
  saveCommerceModule,
  saveStoreModule,
} from '../src/lib/erp/commerce-service';
import { saveCatalogModule } from '../src/lib/products/catalog-service';
import { seedProductCategories, seedPriceLists } from '../src/catalog/catalogSeed';

const commercePayload = {
  saleInvoices: [
    {
      id: 'FAUX-M3-SAL-DB-001',
      customerId: 'test-customer',
      date: '2026-11-01',
      status: 'confirmed' as const,
      total: 1000,
      kind: 'sale' as const,
    },
  ],
  incomeTypes: ['فروش نقدی'],
  incomeRows: [
    {
      id: 'FAUX-M3-INC-DB-001',
      title: 'FAUX-M3-INCOME-db',
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
};

const storePayload = {
  products: [
    {
      id: 'FAUX-M3-STR-DB-001',
      name: 'FAUX-M3-STORE-DB',
      cat: 'مبلمان',
      price: '1000',
      stock: '1',
      seo: 'خوب',
      status: 'active' as const,
    },
  ],
  orders: [],
  seo: { title: 'FAUX-M3-STORE-SEO', description: 'db test', keywords: '' },
  settings: { shopName: 'FAUX-M3-SHOP', currency: 'تومان', shippingNote: '' },
};

const blogPayload = {
  posts: [
    {
      id: 'FAUX-M3-BLG-DB-001',
      title: 'FAUX-M3-BLOG-DB',
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
};

async function main() {
  const business = await prisma.business.findFirst({ select: { id: true, name: true } });
  assert.ok(business, 'no business in DB — seed or create one first');
  const businessId = business.id;
  console.log(`using business: ${business.name} (${businessId})`);

  await saveCommerceModule(businessId, commercePayload);
  const commerce = await getCommerceModule(businessId);
  assert.equal(commerce.saleInvoices.length, 1);
  assert.equal(commerce.saleInvoices[0]?.id, 'FAUX-M3-SAL-DB-001');

  await saveStoreModule(businessId, storePayload);
  await saveBlogModule(businessId, blogPayload);

  await saveCatalogModule(businessId, {
    productCategories: [
      ...seedProductCategories,
      { id: 'pcat-faux-m3-db', name: 'FAUX-M3-CAT-DB' },
    ],
    priceLists: seedPriceLists,
  });

  console.log('test:commerce-module-db OK');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
