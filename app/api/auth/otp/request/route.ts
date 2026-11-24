import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { normalizeIranMobile } from '@/src/lib/auth/phone';
import { requestOtpForMobile } from '@/src/lib/otp/service';

const bodySchema = z.object({
  mobile: z.string().min(10),
});

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.parse(await req.json());
    const mobile = normalizeIranMobile(body.mobile);
    if (!mobile) {
      return jsonError('VALIDATION_ERROR', 'شماره موبایل معتبر نیست (مثال: 09121234567).', 400);
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      undefined;

    const result = await requestOtpForMobile(mobile, ip);
    if (!result.ok) {
      const status = result.code === 'RATE_LIMIT' || result.code === 'COOLDOWN' ? 429 : 400;
      return jsonError(result.code, result.message, status);
    }

    if ('pending' in result && result.pending) {
      return jsonOk({ sent: false, pending: true, message: result.message });
    }

    return jsonOk({ sent: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError('VALIDATION_ERROR', 'ورودی نامعتبر است.', 400);
    }
    return handleAuthRouteError(err, 'otp-request');
  }
}
