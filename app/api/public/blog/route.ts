import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('comment'),
    businessId: z.string().optional(),
    postId: z.string().min(1),
    user: z.string().min(2),
    email: z.string().email().optional().or(z.literal('')).default(''),
    text: z.string().min(2),
  }),
  z.object({
    action: z.literal('subscribe'),
    businessId: z.string().optional(),
    email: z.string().email(),
  }),
  z.object({
    action: z.literal('view'),
    postId: z.string().min(1),
  }),
]);

async function resolvePublicBusinessId(requestedId?: string | null): Promise<string | null> {
  if (requestedId) {
    const found = await prisma.business.findFirst({
      where: { id: requestedId, status: 'active' },
      select: { id: true },
    });
    if (found) return found.id;
  }
  const published = await prisma.blogSettings.findFirst({
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
        settings: { seoTitle: 'بلاگ نکساپوینت', seoDescription: '' },
        categories: [],
        posts: [],
      });
    }

    const [settings, categories, posts] = await Promise.all([
      prisma.blogSettings.findUnique({ where: { businessId } }),
      prisma.blogCategory.findMany({ where: { businessId }, orderBy: { name: 'asc' } }),
      prisma.blogPost.findMany({
        where: { businessId, publishState: 'published' },
        include: {
          comments: {
            where: { status: 'تایید شده' },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return jsonOk({
      businessId,
      settings: {
        seoTitle: settings?.seoTitle ?? 'بلاگ نکساپوینت',
        seoDescription: settings?.seoDescription ?? '',
      },
      categories,
      posts: posts.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        content: p.content,
        author: p.author,
        date: p.date,
        views: p.views,
        category: p.categoryName,
        coverImageUrl: p.coverImageKey
          ? `/api/storage/public/${p.coverImageKey.split('/').map(encodeURIComponent).join('/')}`
          : null,
        comments: p.comments,
      })),
    });
  } catch (err) {
    return handleAuthRouteError(err, 'public.blog.get');
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = actionSchema.parse(await req.json());

    if (body.action === 'view') {
      await prisma.blogPost.updateMany({
        where: { id: body.postId },
        data: { views: { increment: 1 } },
      });
      return jsonOk({ incremented: true });
    }

    const businessId = await resolvePublicBusinessId(body.businessId);
    if (!businessId) {
      return jsonError('NOT_FOUND', 'بلاگ فعالی یافت نشد.', 404);
    }

    if (body.action === 'subscribe') {
      await prisma.newsletterSubscriber.upsert({
        where: { businessId_email: { businessId, email: body.email.trim().toLowerCase() } },
        create: { businessId, email: body.email.trim().toLowerCase(), active: true },
        update: { active: true },
      });
      return jsonOk({ subscribed: true }, { status: 201 });
    }

    const post = await prisma.blogPost.findFirst({ where: { id: body.postId, businessId } });
    if (!post) return jsonError('NOT_FOUND', 'مقاله یافت نشد.', 404);

    const created = await prisma.blogComment.create({
      data: {
        businessId,
        postId: post.id,
        postTitle: post.title,
        user: body.user,
        email: body.email,
        text: body.text,
        date: new Intl.DateTimeFormat('fa-IR').format(new Date()),
        status: 'در انتظار تایید',
      },
    });
    return jsonOk(created, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'public.blog.post');
  }
}
