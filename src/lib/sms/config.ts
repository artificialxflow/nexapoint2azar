import { z } from 'zod';

const smsEnvSchema = z.object({
  SMS_PROVIDER: z.enum(['mock', 'smsir']).default('mock'),
  SMS_IR_API_KEY: z.string().optional(),
  SMS_IR_TEMPLATE_ID: z.string().optional(),
});

export type SmsEnv = z.infer<typeof smsEnvSchema>;

let cached: SmsEnv | null = null;

export function getSmsConfig(): SmsEnv {
  if (cached) return cached;
  cached = smsEnvSchema.parse(process.env);
  return cached;
}
