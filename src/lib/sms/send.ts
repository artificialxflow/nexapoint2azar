import { createLogger } from '@/src/lib/logger';
import { getSmsConfig } from '@/src/lib/sms/config';

const log = createLogger('sms');

export async function sendOtpSms(mobilePhone: string, code: string): Promise<void> {
  const { SMS_PROVIDER, SMS_IR_API_KEY, SMS_IR_TEMPLATE_ID } = getSmsConfig();

  if (SMS_PROVIDER === 'mock') {
    log.info('mock OTP SMS', { mobile: mobilePhone.slice(0, 4) + '***', code });
    return;
  }

  if (!SMS_IR_API_KEY || !SMS_IR_TEMPLATE_ID) {
    throw new Error('SMS_IR_NOT_CONFIGURED');
  }

  const res = await fetch('https://api.sms.ir/v1/send/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': SMS_IR_API_KEY,
    },
    body: JSON.stringify({
      mobile: mobilePhone,
      templateId: Number(SMS_IR_TEMPLATE_ID),
      parameters: [{ name: 'CODE', value: code }],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    log.error('sms.ir failed', { status: res.status, body: text.slice(0, 200) });
    throw new Error('SMS_SEND_FAILED');
  }
}
