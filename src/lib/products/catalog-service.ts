import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/src/lib/db/prisma';
import type { Product, ProductCategory } from '@/src/types/product';
import type { PriceList } from '@/src/types/person';
import { productSchema, catalogModuleSchema } from '@/src/lib/erp/commerce-zod';
import { moneyFromNumber } from '@/src/lib/money/decimal';

export class CatalogNotFoundError extends Error {
  code = 'NOT_FOUND';
}

export class CatalogValidationError extends Error {
  code = 'VALIDATION';
}

export async function requireCatalogProduct(businessId: string, productId: string): Promise<void> {
  const id = productId?.trim();
  if (!id) throw new CatalogValidationError('شناسه کالا الزامی است.');
  const row = await prisma.catalogProduct.findUnique({
    where: { businessId_productId: { businessId, productId: id } },
    select: { productId: true },
  });
  if (!row) throw new CatalogNotFoundError('کالا در کاتالوگ یافت نشد.');
}

function catalogRetailPrice(product: Product): number {
  const prices = product.prices ?? {};
  const retail = prices['pl-retail'] ?? prices.retail ?? Object.values(prices)[0];
  return typeof retail === 'number' && Number.isFinite(retail) ? Math.round(retail) : 0;
}

async function syncStoreProductsFromCatalog(businessId: string, productId: string, product: Product) {
  const stockTrack = product.inventory?.trackStock ? Math.max(0, Math.round(product.inventory.reorderPoint ?? 0)) : 0;
  await prisma.storeProduct.updateMany({
    where: { businessId, catalogProductId: productId },
    data: {
      name: product.name,
      priceNum: moneyFromNumber(catalogRetailPrice(product)),
      stockQty: stockTrack,
      status: product.status === 'inactive' ? 'inactive' : 'active',
    },
  });
}

const DEFAULT_PRICE_LISTS: PriceList[] = [
  { id: 'pl-retail', name: 'نرخ پایه', tier: 'retail' },
];

function rowToProduct(data: unknown): Product {
  return productSchema.parse(data);
}

function newProductId() {
  return randomUUID();
}

export async function ensureCatalogMeta(businessId: string) {
  const existing = await prisma.businessCatalogMeta.findUnique({ where: { businessId } });
  if (existing) return existing;
  return prisma.businessCatalogMeta.create({
    data: {
      businessId,
      productCategories: [] as unknown as Prisma.InputJsonValue,
      priceLists: DEFAULT_PRICE_LISTS as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function getCatalog(businessId: string) {
  const [meta, productRows] = await Promise.all([
    ensureCatalogMeta(businessId),
    prisma.catalogProduct.findMany({ where: { businessId }, orderBy: { createdAt: 'asc' } }),
  ]);
  return {
    products: productRows.map((r) => rowToProduct(r.data)),
    productCategories: (meta.productCategories as unknown as ProductCategory[]) ?? [],
    priceLists: (meta.priceLists as unknown as PriceList[]) ?? DEFAULT_PRICE_LISTS,
  };
}

export async function getCatalogModule(businessId: string) {
  const meta = await ensureCatalogMeta(businessId);
  return catalogModuleSchema.parse({
    productCategories: meta.productCategories,
    priceLists: meta.priceLists,
  });
}

export async function saveCatalogModule(
  businessId: string,
  raw: { productCategories: ProductCategory[]; priceLists: PriceList[] }
) {
  const parsed = catalogModuleSchema.parse(raw);
  await ensureCatalogMeta(businessId);
  await prisma.businessCatalogMeta.update({
    where: { businessId },
    data: {
      productCategories: parsed.productCategories as unknown as Prisma.InputJsonValue,
      priceLists: parsed.priceLists as unknown as Prisma.InputJsonValue,
    },
  });
  return parsed;
}

export async function createProduct(businessId: string, raw: unknown) {
  const partial = productSchema.partial().parse(raw);
  const productId = partial.id?.trim() || newProductId();
  const accountingCode =
    partial.accountingCode?.trim() ||
    String(
      20000 +
        (await prisma.catalogProduct.count({ where: { businessId } })) +
        1
    );
  const product = productSchema.parse({
    ...partial,
    id: productId,
    accountingCode,
    categoryIds: partial.categoryIds ?? [],
    images: partial.images ?? { gallery: [] },
    prices: partial.prices ?? {},
    purchasePrice: partial.purchasePrice ?? 0,
    units: partial.units ?? { main: 'عدد', hasSecondary: false },
    inventory: partial.inventory ?? {
      trackStock: true,
      reorderPoint: 0,
      minOrder: 1,
      leadTimeDays: 0,
    },
    tax: partial.tax ?? {
      hasSalesTax: true,
      salesTaxRate: 10,
      hasPurchaseTax: false,
      purchaseTaxRate: 0,
      taxType: '۱۲- سایر کالاها',
    },
    status: partial.status ?? 'active',
    type: partial.type ?? 'goods',
    code: partial.code ?? accountingCode,
    name: partial.name ?? 'کالای جدید',
  });

  await prisma.catalogProduct.create({
    data: {
      businessId,
      productId,
      name: product.name,
      code: product.code,
      accountingCode: product.accountingCode,
      type: product.type,
      status: product.status,
      data: product as unknown as Prisma.InputJsonValue,
    },
  });
  return product;
}

export async function updateProduct(businessId: string, productId: string, patch: Partial<Product>) {
  const existing = await prisma.catalogProduct.findUnique({
    where: { businessId_productId: { businessId, productId } },
  });
  if (!existing) {
    throw new CatalogNotFoundError('کالا یافت نشد.');
  }
  const current = rowToProduct(existing.data);
  const next = productSchema.parse({ ...current, ...patch, id: productId, accountingCode: current.accountingCode });
  const updated = await prisma.catalogProduct.update({
    where: { businessId_productId: { businessId, productId } },
    data: {
      name: next.name,
      code: next.code,
      type: next.type,
      status: next.status,
      data: next as unknown as Prisma.InputJsonValue,
    },
  });
  const parsed = rowToProduct(updated.data);
  await syncStoreProductsFromCatalog(businessId, productId, parsed);
  return parsed;
}

export async function deleteProduct(businessId: string, productId: string) {
  const existing = await prisma.catalogProduct.findUnique({
    where: { businessId_productId: { businessId, productId } },
  });
  if (!existing) throw new CatalogNotFoundError('کالا یافت نشد.');
  await prisma.catalogProduct.delete({
    where: { businessId_productId: { businessId, productId } },
  });
}
