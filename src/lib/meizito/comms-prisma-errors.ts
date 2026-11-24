import { Prisma } from '@prisma/client';
import { MeizitoHttpError } from '@/src/lib/meizito/meizito-http-error';
import { meizitoModuleLog } from '@/src/lib/meizito/logger';

const requestsLog = meizitoModuleLog('requests');

/** Map Prisma client errors to HTTP-friendly Meizito errors (logged, no PII). */
export function assertPrismaOrRethrowMeizito(err: unknown, context: string): never {
  if (err instanceof MeizitoHttpError) throw err;
  if (err instanceof Prisma.PrismaClientValidationError) {
    requestsLog.error(`${context}: prisma validation`, {
      message: err.message.slice(0, 200),
    });
    throw new MeizitoHttpError(
      400,
      'دادهٔ درخواست نامعتبر است. فیلدهای اجباری را بررسی کنید.'
    );
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    requestsLog.error(`${context}: prisma known`, { code: err.code, meta: err.meta });
    throw new MeizitoHttpError(400, 'ذخیرهٔ درخواست ناموفق بود.');
  }
  throw err;
}
