import { randomBytes } from 'crypto';

/** ورود OTP-first: username یکتا از موبایل یا پسوند تصادفی */
export function usernameFromMobile(mobilePhone: string): string {
  return mobilePhone;
}

export function fallbackUsername(): string {
  return `user_${randomBytes(4).toString('hex')}`;
}
