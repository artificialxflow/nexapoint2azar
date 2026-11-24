import { z } from 'zod';

const otpEnvSchema = z.object({
  OTP_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(120),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(60),
  OTP_MAX_VERIFY_ATTEMPTS: z.coerce.number().int().positive().default(5),
  OTP_MAX_SEND_PER_PHONE_PER_DAY: z.coerce.number().int().positive().default(10),
});

export type OtpEnv = z.infer<typeof otpEnvSchema>;

let cached: OtpEnv | null = null;

export function getOtpConfig(): OtpEnv {
  if (cached) return cached;
  cached = otpEnvSchema.parse(process.env);
  return cached;
}
