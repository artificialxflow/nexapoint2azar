import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { moneyFromNumber, moneyToNumber } from '@/src/lib/money/decimal';

const orderSchema = z.object({
  businessId: z.string().optional(),
  customerName: z.string().min(2),
  customerPhone: z.string().min(7),
  shippingAddress: z.string().min(4),
  notes: z.string().optional().default(''),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1),
      })
    )
    .min(1),
});

async function resolvePublicBusinessId(requestedId?: string | null): Promise<string | null> {
  if (requestedId) {
    const found = await prisma.business.findFirst({
      where: { id: requestedId, status: 'active' },
      select: { id: true },
    });
    if (found) return found.id;
  }
  const published = await prisma.storeSettings.findFirst({
    where: { isPublished: true },
    select: { businessId: true },
  });
  if (published) return published.businessId;

  const first = await prisma.business.findFirst({
    where: { status: 'active' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  return first?.id ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const requested = req.nextUrl.searchParams.get('businessId');
    const businessId = await resolvePublicBusinessId(requested);
    if (!businessId) {
      return jsonOk({
        businessId: null,
        settings: { shopName: 'فروشگاه نکسا', currency: 'تومان', shippingNote: '' },
        categories: [],
        products: [],
      });
    }

    const [settings, products] = await Promise.all([
      prisma.storeSettings.findUnique({ where: { businessId } }),
      prisma.storeProduct.findMany({
        where: { businessId, status: 'active' },
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));

    return jsonOk({
      businessId,
      settings: {
        shopName: settings?.shopName ?? 'فروشگاه نکسا',
        currency: settings?.currency ?? 'تومان',
        shippingNote: settings?.shippingNote ?? '',
        seoTitle: settings?.seoTitle ?? '',
        seoDescription: settings?.seoDescription ?? '',
      },
      categories,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: moneyToNumber(p.priceNum),
        priceLabel: moneyToNumber(p.priceNum).toLocaleString('fa-IR'),
        stockQty: p.stockQty,
        description: p.description,
        featured: p.featured,
        imageUrl: p.imageKey
          ? `/api/storage/public/${p.imageKey.split('/').map(encodeURIComponent).join('/')}`
          : null,
      })),
    });
  } catch (err) {
    return handleAuthRouteError(err, 'public.shop.get');
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = orderSchema.parse(await req.json());
    const businessId = await resolvePublicBusinessId(body.businessId);
    if (!businessId) {
      return jsonError('NOT_FOUND', 'فروشگاهی برای ثبت سفارش یافت نشد.', 404);
    }

    const productIds = body.items.map((i) => i.productId);
    const dbProducts = await prisma.storeProduct.findMany({
      where: { businessId, id: { in: productIds }, status: 'active' },
    });
    const byId = new Map(dbProducts.map((p) => [p.id, p]));

    let totalNum = 0;
    const lineCreates: Array<{
      storeProductId: string;
      title: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }> = [];

    for (const item of body.items) {
      const prod = byId.get(item.productId);
      if (!prod) return jsonError('NOT_FOUND', 'یکی از کالاهای سبد خرید یافت نشد.', 404);
      const unitPrice = moneyToNumber(prod.priceNum);
      const lineTotal = unitPrice * item.quantity;
      totalNum += lineTotal;
      lineCreates.push({
        storeProductId: prod.id,
        title: prod.name,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      });
    }

    const count = await prisma.storeOrder.count({ where: { businessId } });
    const orderNo = `SHP-${1001 + count}`;
    const { businessDateToPrismaDate } = await import('@/src/lib/dates/business-date');
    const orderDate = businessDateToPrismaDate(new Date());

    const created = await prisma.storeOrder.create({
      data: {
        businessId,
        orderNo,
        customer: body.customerName,
        customerPhone: body.customerPhone,
        shippingAddress: body.shippingAddress,
        date: orderDate,
        totalNum: moneyFromNumber(totalNum),
        status: 'pending_processing',
        notes: body.notes,
        items: {
          create: lineCreates.map((l) => ({
            ...l,
            unitPrice: moneyFromNumber(l.unitPrice),
            lineTotal: moneyFromNumber(l.lineTotal),
          })),
        },
      },
      include: { items: true },
    });

    return jsonOk(
      {
        id: created.id,
        orderNo: created.orderNo,
        totalNum: moneyToNumber(created.totalNum),
        status: created.status,
      },
      { status: 201 }
    );
  } catch (err) {
    return handleAuthRouteError(err, 'public.shop.order');
  }
}
