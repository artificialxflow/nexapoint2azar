import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireSessionUser } from '@/src/lib/auth/session';
import { storagePublicRoot, storageUploadsRoot } from '@/src/lib/storage/paths';
import {
  assertValidProfileImage,
  type ImageUploadPurpose,
} from '@/src/lib/media/validate-upload-image';
import { isEntityAttachmentHost } from '@/src/lib/attachments/entity-attachment-service';

export async function GET(req: NextRequest) {
  try {
    const user = await requireSessionUser(req);
    const businessId = req.nextUrl.searchParams.get('businessId')?.trim() || undefined;
    const entityType = req.nextUrl.searchParams.get('entityType')?.trim() || undefined;
    const entityId = req.nextUrl.searchParams.get('entityId')?.trim() || undefined;

    if (businessId) {
      const member = await prisma.businessMember.findUnique({
        where: { businessId_userId: { businessId, userId: user.id } },
      });
      if (!member && user.systemRole.level < 100) {
        return jsonError('FORBIDDEN', 'دسترسی مجاز نیست.', 403);
      }
    }

    const rows = await prisma.attachment.findMany({
      where: {
        ...(businessId ? { businessId } : { uploaderId: user.id }),
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return jsonOk(
      rows.map((r) => ({
        id: r.id,
        fileKey: r.fileKey,
        url: r.isPublic
          ? `/api/storage/public/${r.fileKey.split('/').map(encodeURIComponent).join('/')}`
          : `/api/attachments/${r.fileKey.split('/').map(encodeURIComponent).join('/')}`,
        name: r.originalName,
        mimeType: r.mimeType,
        size: r.sizeBytes,
        isPublic: r.isPublic,
        createdAt: r.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    return handleAuthRouteError(err, 'attachments.list');
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser(req);
    const form = await req.formData();
    const file = form.get('file');
    if (!file || !(file instanceof Blob)) {
      return jsonError('VALIDATION_ERROR', 'فایل ارسال نشده است.', 400);
    }

    const purposeRaw = form.get('purpose');
    const purpose =
      purposeRaw === 'avatar' || purposeRaw === 'business-logo'
        ? (purposeRaw as ImageUploadPurpose)
        : null;
    const isPublic = form.get('isPublic') === 'true' || purposeRaw === 'public-media';
    const businessIdRaw = form.get('businessId');
    const businessId = typeof businessIdRaw === 'string' && businessIdRaw.trim() ? businessIdRaw.trim() : null;
    const entityTypeRaw = form.get('entityType');
    const entityType = typeof entityTypeRaw === 'string' && entityTypeRaw.trim() ? entityTypeRaw.trim() : (purpose ?? 'general');
    const entityIdRaw = form.get('entityId');
    const entityId = typeof entityIdRaw === 'string' && entityIdRaw.trim() ? entityIdRaw.trim() : null;

    const mimeType = typeof (file as File).type === 'string' ? (file as File).type : 'application/octet-stream';
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > 20 * 1024 * 1024) {
      return jsonError('VALIDATION_ERROR', 'حداکثر حجم مجاز فایل ۲۰ مگابایت است.', 400);
    }

    if (purpose) {
      try {
        assertValidProfileImage(file, mimeType, buffer.length);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'فایل تصویر نامعتبر است.';
        return jsonError('VALIDATION_ERROR', message, 400);
      }
    }

    const originalName =
      typeof (file as File).name === 'string' ? (file as File).name : 'upload.bin';
    const safe = originalName.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
    const stamp = new Date().toISOString().slice(0, 10);
    const fileKey = path.join(stamp, `${randomUUID()}-${safe}`).replace(/\\/g, '/');

    const root = isPublic ? storagePublicRoot() : storageUploadsRoot();
    const absolute = path.join(root, fileKey);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, buffer);

    const row = await prisma.attachment.create({
      data: {
        businessId,
        uploaderId: user.id,
        entityType,
        entityId,
        fileKey,
        originalName,
        mimeType,
        sizeBytes: buffer.length,
        isPublic,
      },
    });

    if (businessId && entityId && isEntityAttachmentHost(entityType)) {
      await prisma.entityAttachment.create({
        data: {
          businessId,
          entityType,
          entityId,
          attachmentId: row.id,
          sortOrder: 0,
        },
      });
    }

    return jsonOk(
      {
        id: row.id,
        fileKey,
        url: isPublic
          ? `/api/storage/public/${fileKey.split('/').map(encodeURIComponent).join('/')}`
          : `/api/attachments/${fileKey.split('/').map(encodeURIComponent).join('/')}`,
        name: originalName,
        size: buffer.length,
        isPublic,
      },
      { status: 201 }
    );
  } catch (err) {
    return handleAuthRouteError(err, 'attachments.upload');
  }
}
