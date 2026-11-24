import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AuthConfigError } from '@/src/lib/auth/config';
import { createLogger } from '@/src/lib/logger';
import { CommerceValidationError } from '@/src/lib/erp/commerce-service';

const log = createLogger('auth');

export function prismaErrorDetails(err: unknown): { code?: string; meta?: unknown } | undefined {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return { code: err.code, meta: err.meta };
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    return { code: 'VALIDATION' };
  }
  return undefined;
}

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data }, init);
}

export function jsonError(
  code: string,
  message: string,
  status = 400,
  details?: unknown
): NextResponse {
  return NextResponse.json({ ok: false, error: { code, message, details } }, { status });
}

export function handleAuthRouteError(err: unknown, context: string): NextResponse {
  if (err instanceof AuthConfigError) {
    log.error(`${context} config error`, { error: err.message });
    return jsonError('CONFIG_ERROR', err.message, 503);
  }

  if (err instanceof ZodError) {
    return jsonError('VALIDATION_ERROR', 'ورودی نامعتبر است.', 400);
  }

  if (err instanceof Error) {
    if (err.message === 'UNAUTHORIZED') {
      return jsonError('UNAUTHORIZED', 'لطفاً وارد شوید.', 401);
    }
    if (err.message === 'FORBIDDEN') {
      return jsonError('FORBIDDEN', 'دسترسی مجاز نیست.', 403);
    }
    if (err.message === 'NOT_FOUND') {
      return jsonError('NOT_FOUND', 'مورد یافت نشد.', 404);
    }
    if (err instanceof CommerceValidationError) {
      return jsonError('VALIDATION', err.message, 400);
    }
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    log.error(`${context} database unavailable`, { error: err.message });
    return jsonError(
      'DB_UNAVAILABLE',
      'اتصال به پایگاه داده PostgreSQL برقرار نیست. لطفاً متغیرهای DATABASE_URL و DIRECT_URL را تنظیم کرده و مایگریشن/seed را اجرا کنید.',
      503
    );
  }

  const prismaDetails = prismaErrorDetails(err);
  log.error(`${context} failed`, {
    error: err instanceof Error ? err.message : String(err),
    ...(prismaDetails ? { prisma: prismaDetails } : {}),
  });
  return jsonError('INTERNAL_ERROR', 'خطای داخلی سرور.', 500, prismaDetails);
}
