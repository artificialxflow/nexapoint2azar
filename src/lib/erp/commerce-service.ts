import type { CommerceDocumentKind, Prisma } from '@prisma/client';
import { prisma } from '@/src/lib/db/prisma';
import type {
  BlogModulePayload,
  CommerceModulePayload,
  StoreModulePayload,
} from '@/src/types/commerce';
import {
  blogModuleSchema,
  commerceModuleSchema,
  storeModuleSchema,
} from '@/src/lib/erp/commerce-zod';
import { moneyFromNumber, moneyToNumber } from '@/src/lib/money/decimal';
import { formatBusinessDateJalali, parseBusinessDateForDb } from '@/src/lib/dates/business-date';
import { labelStoreOrderStatus, parseStoreOrderStatus } from '@/src/lib/erp/flow-status';
import { PublishStatus } from '@prisma/client';
import { requireCatalogProduct } from '@/src/lib/products/catalog-service';

export class CommerceValidationError extends Error {
  code = 'VALIDATION';
  constructor(message: string) {
    super(message);
  }
}

const defaultIncomeTypes = ['فروش نقدی', 'ارائه خدمات'];

function formatQtyLabel(qty: number): string {
  return Math.max(0, Math.round(qty)).toLocaleString('fa-IR');
}

function formatMoneyLabel(amount: number): string {
  return Math.round(amount).toLocaleString('fa-IR');
}

async function resolveStoreCatalogLink(
  businessId: string,
  product: { id: string; catalogProductId?: string }
): Promise<string | null> {
  if (product.catalogProductId?.trim()) {
    await requireCatalogProduct(businessId, product.catalogProductId);
    return product.catalogProductId.trim();
  }
  const byId = await prisma.catalogProduct.findUnique({
    where: { businessId_productId: { businessId, productId: product.id } },
    select: { productId: true },
  });
  if (byId) return byId.productId;
  return null;
}

function parseNumeric(val: string | number | undefined): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (!val) return 0;
  const cleaned = String(val)
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[^0-9.-]+/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function docKindForSale(kind: 'sale' | 'return'): CommerceDocumentKind {
  return kind === 'return' ? 'sale_return' : 'sale';
}

function docKindForPurchase(kind: 'purchase' | 'return'): CommerceDocumentKind {
  return kind === 'return' ? 'purchase_return' : 'purchase';
}

async function ensureCommerceMeta(businessId: string) {
  const existing = await prisma.businessCommerceMeta.findUnique({ where: { businessId } });
  if (existing) return existing;
  return prisma.businessCommerceMeta.create({
    data: {
      businessId,
      incomeTypes: defaultIncomeTypes as unknown as Prisma.InputJsonValue,
      installments: [] as unknown as Prisma.InputJsonValue,
      productDiscounts: [] as unknown as Prisma.InputJsonValue,
    },
  });
}

function buildCommercePayloadFromRows(
  meta: { incomeTypes: unknown; installments: unknown; productDiscounts: unknown },
  docs: Array<{ kind: CommerceDocumentKind; data: unknown }>
): CommerceModulePayload {
  const saleInvoices: CommerceModulePayload['saleInvoices'] = [];
  const purchaseInvoices: CommerceModulePayload['purchaseInvoices'] = [];
  const expenses: CommerceModulePayload['expenses'] = [];
  const wastes: CommerceModulePayload['wastes'] = [];
  const incomeRows: CommerceModulePayload['incomeRows'] = [];

  for (const row of docs) {
    const data = row.data as unknown;
    switch (row.kind) {
      case 'sale':
        saleInvoices.push({ ...(data as CommerceModulePayload['saleInvoices'][0]), kind: 'sale' });
        break;
      case 'sale_return':
        saleInvoices.push({ ...(data as CommerceModulePayload['saleInvoices'][0]), kind: 'return' });
        break;
      case 'purchase':
      case 'purchase_return':
        purchaseInvoices.push({
          ...(data as CommerceModulePayload['purchaseInvoices'][0]),
          kind: row.kind === 'purchase_return' ? 'return' : 'purchase',
        });
        break;
      case 'expense':
        expenses.push(data as CommerceModulePayload['expenses'][0]);
        break;
      case 'waste':
        wastes.push(data as CommerceModulePayload['wastes'][0]);
        break;
      case 'income':
        incomeRows.push(data as CommerceModulePayload['incomeRows'][0]);
        break;
      default:
        break;
    }
  }

  try {
    return commerceModuleSchema.parse({
      saleInvoices,
      incomeTypes: meta.incomeTypes as unknown as string[],
      incomeRows,
      installments: meta.installments as unknown as CommerceModulePayload['installments'],
      productDiscounts: meta.productDiscounts as unknown as CommerceModulePayload['productDiscounts'],
      purchaseInvoices,
      expenses,
      wastes,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'دادهٔ بازرگانی در دیتابیس نامعتبر است.';
    throw new CommerceValidationError(msg);
  }
}

export async function getCommerceModule(businessId: string): Promise<CommerceModulePayload> {
  const [meta, docs] = await Promise.all([
    ensureCommerceMeta(businessId),
    prisma.commerceDocument.findMany({ where: { businessId }, orderBy: { createdAt: 'asc' } }),
  ]);

  return buildCommercePayloadFromRows(meta, docs);
}

export async function saveCommerceModule(
  businessId: string,
  raw: CommerceModulePayload
): Promise<CommerceModulePayload> {
  const bundle = commerceModuleSchema.parse(raw);

  await prisma.businessCommerceMeta.upsert({
    where: { businessId },
    create: {
      businessId,
      incomeTypes: bundle.incomeTypes as unknown as Prisma.InputJsonValue,
      installments: bundle.installments as unknown as Prisma.InputJsonValue,
      productDiscounts: bundle.productDiscounts as unknown as Prisma.InputJsonValue,
    },
    update: {
      incomeTypes: bundle.incomeTypes as unknown as Prisma.InputJsonValue,
      installments: bundle.installments as unknown as Prisma.InputJsonValue,
      productDiscounts: bundle.productDiscounts as unknown as Prisma.InputJsonValue,
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${businessId}))`;
    await tx.commerceDocument.deleteMany({ where: { businessId } });

    for (const inv of bundle.saleInvoices) {
      await tx.commerceDocument.create({
        data: {
          businessId,
          kind: docKindForSale(inv.kind),
          docDate: inv.date || '',
          totalAmount: moneyFromNumber(Number(inv.total) || 0),
          status: inv.status || 'confirmed',
          data: inv as unknown as Prisma.InputJsonValue,
        },
      });
    }
    for (const inv of bundle.purchaseInvoices) {
      const lineTotal = (inv.invoiceItems ?? []).reduce(
        (s, l) => s + (Number(l.quantity) * Number(l.unitPrice) - Number(l.discount) + Number(l.tax)),
        Number(inv.freight) || 0
      );
      await tx.commerceDocument.create({
        data: {
          businessId,
          kind: docKindForPurchase(inv.kind),
          docDate: inv.date || '',
          totalAmount: moneyFromNumber(lineTotal),
          status: inv.status || 'confirmed',
          data: inv as unknown as Prisma.InputJsonValue,
        },
      });
    }
    for (const exp of bundle.expenses) {
      await tx.commerceDocument.create({
        data: {
          businessId,
          kind: 'expense',
          docDate: exp.dateTime || '',
          totalAmount: moneyFromNumber(Number(exp.amount) || 0),
          status: 'confirmed',
          data: exp as unknown as Prisma.InputJsonValue,
        },
      });
    }
    for (const w of bundle.wastes) {
      await tx.commerceDocument.create({
        data: {
          businessId,
          kind: 'waste',
          docDate: w.date || '',
          totalAmount: moneyFromNumber(Number(w.quantity) || 0),
          status: 'confirmed',
          data: w as unknown as Prisma.InputJsonValue,
        },
      });
    }
    for (const inc of bundle.incomeRows) {
      await tx.commerceDocument.create({
        data: {
          businessId,
          kind: 'income',
          docDate: inc.date || '',
          totalAmount: moneyFromNumber(Number(inc.amount) || 0),
          status: 'confirmed',
          data: inc as unknown as Prisma.InputJsonValue,
        },
      });
    }
  });

  return getCommerceModule(businessId);
}

// ---------------------------------------------------------------------------
// Normalized Store Module (StoreSettings + StoreProduct + StoreOrder)
// ---------------------------------------------------------------------------

export async function getStoreModule(businessId: string): Promise<StoreModulePayload> {
  const [settings, products, orders] = await Promise.all([
    prisma.storeSettings.findUnique({ where: { businessId } }),
    prisma.storeProduct.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } }),
    prisma.storeOrder.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } }),
  ]);

  return {
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      cat: p.category,
      price: formatMoneyLabel(moneyToNumber(p.priceNum)),
      stock: formatQtyLabel(p.stockQty),
      seo: p.seo,
      status: p.status === 'inactive' ? 'inactive' : 'active',
      catalogProductId: p.catalogProductId ?? undefined,
    })),
    orders: orders.map((o) => ({
      id: o.orderNo || o.id,
      customer: o.customer,
      date: o.date ? formatBusinessDateJalali(o.date) : '',
      total: formatMoneyLabel(moneyToNumber(o.totalNum)),
      status: labelStoreOrderStatus(o.status),
    })),
    seo: {
      title: settings?.seoTitle ?? '',
      description: settings?.seoDescription ?? '',
      keywords: settings?.seoKeywords ?? '',
    },
    settings: {
      shopName: settings?.shopName ?? 'فروشگاه نکسا',
      currency: settings?.currency ?? 'تومان',
      shippingNote: settings?.shippingNote ?? '',
    },
  };
}

export async function saveStoreModule(businessId: string, raw: StoreModulePayload): Promise<StoreModulePayload> {
  const payload = storeModuleSchema.parse(raw);

  await prisma.$transaction(async (tx) => {
    await tx.storeSettings.upsert({
      where: { businessId },
      create: {
        businessId,
        shopName: payload.settings.shopName,
        currency: payload.settings.currency,
        shippingNote: payload.settings.shippingNote,
        seoTitle: payload.seo.title,
        seoDescription: payload.seo.description,
        seoKeywords: payload.seo.keywords,
      },
      update: {
        shopName: payload.settings.shopName,
        currency: payload.settings.currency,
        shippingNote: payload.settings.shippingNote,
        seoTitle: payload.seo.title,
        seoDescription: payload.seo.description,
        seoKeywords: payload.seo.keywords,
      },
    });

    await tx.storeProduct.deleteMany({ where: { businessId } });
    for (const p of payload.products) {
      const catalogProductId = await resolveStoreCatalogLink(businessId, p);
      await tx.storeProduct.create({
        data: {
          id: p.id,
          businessId,
          catalogProductId,
          name: p.name,
          category: p.cat || 'عمومی',
          priceNum: moneyFromNumber(parseNumeric(p.price)),
          stockQty: Math.max(0, Math.round(parseNumeric(p.stock))),
          seo: p.seo || '',
          status: p.status,
        },
      });
    }

    await tx.storeOrder.deleteMany({ where: { businessId } });
    for (const o of payload.orders) {
      await tx.storeOrder.create({
        data: {
          businessId,
          orderNo: o.id,
          customer: o.customer,
          date: parseBusinessDateForDb(o.date),
          totalNum: moneyFromNumber(parseNumeric(o.total)),
          status: parseStoreOrderStatus(o.status),
        },
      });
    }
  });

  return getStoreModule(businessId);
}

// ---------------------------------------------------------------------------
// Normalized Blog Module (BlogSettings + BlogCategory + BlogPost + BlogComment)
// ---------------------------------------------------------------------------

export async function getBlogModule(businessId: string): Promise<BlogModulePayload> {
  const [settings, categories, posts, comments] = await Promise.all([
    prisma.blogSettings.findUnique({ where: { businessId } }),
    prisma.blogCategory.findMany({ where: { businessId }, orderBy: { createdAt: 'asc' } }),
    prisma.blogPost.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } }),
    prisma.blogComment.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } }),
  ]);

  return {
    posts: posts.map((p) => ({
      id: p.id,
      title: p.title,
      author: p.author,
      date: p.date ? formatBusinessDateJalali(p.date) : '',
      views: String(p.views),
      status:
        p.publishState === PublishStatus.draft
          ? 'پیش‌نویس'
          : p.publishState === PublishStatus.archived
            ? 'بایگانی'
            : 'منتشر شده',
      category: p.categoryName,
    })),
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      count: c.count,
      slug: c.slug,
    })),
    comments: comments.map((cm) => ({
      id: cm.id,
      user: cm.user,
      text: cm.text,
      date: cm.date ? formatBusinessDateJalali(cm.date) : '',
      post: cm.postTitle,
      status: cm.status,
    })),
    seo: {
      title: settings?.seoTitle ?? 'بلاگ نکساپوینت',
      description: settings?.seoDescription ?? '',
    },
  };
}

export async function saveBlogModule(businessId: string, raw: BlogModulePayload): Promise<BlogModulePayload> {
  const payload = blogModuleSchema.parse(raw);

  await prisma.$transaction(async (tx) => {
    await tx.blogSettings.upsert({
      where: { businessId },
      create: {
        businessId,
        seoTitle: payload.seo.title,
        seoDescription: payload.seo.description,
      },
      update: {
        seoTitle: payload.seo.title,
        seoDescription: payload.seo.description,
      },
    });

    await tx.blogComment.deleteMany({ where: { businessId } });
    await tx.blogPost.deleteMany({ where: { businessId } });
    await tx.blogCategory.deleteMany({ where: { businessId } });

    const seenSlugs = new Set<string>();
    for (const c of payload.categories) {
      let slug = (c.slug || c.name).trim().toLowerCase().replace(/\s+/g, '-') || c.id;
      if (seenSlugs.has(slug)) slug = `${slug}-${c.id.slice(-4)}`;
      seenSlugs.add(slug);
      await tx.blogCategory.create({
        data: {
          id: c.id,
          businessId,
          name: c.name,
          slug,
          count: c.count,
        },
      });
    }

    for (const p of payload.posts) {
      await tx.blogPost.create({
        data: {
          id: p.id,
          businessId,
          title: p.title,
          slug: p.title.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 80) || p.id,
          author: p.author,
          date: parseBusinessDateForDb(p.date),
          views: Math.max(0, Math.round(parseNumeric(p.views))),
          publishState: p.status.includes('پیش‌نویس')
            ? PublishStatus.draft
            : p.status.includes('بایگانی')
              ? PublishStatus.archived
              : PublishStatus.published,
          categoryName: p.category || 'عمومی',
        },
      });
    }

    for (const cm of payload.comments) {
      await tx.blogComment.create({
        data: {
          id: cm.id,
          businessId,
          user: cm.user,
          text: cm.text,
          date: parseBusinessDateForDb(cm.date),
          postTitle: cm.post,
          status: cm.status,
        },
      });
    }
  });

  return getBlogModule(businessId);
}
