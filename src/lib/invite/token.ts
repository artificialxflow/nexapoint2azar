import { createHash } from 'crypto';
import { getAuthConfig } from '@/src/lib/auth/config';

export function hashInviteToken(token: string): string {
  const secret = getAuthConfig().AUTH_SESSION_SECRET;
  return createHash('sha256').update(`invite:${token}:${secret}`).digest('hex');
}
