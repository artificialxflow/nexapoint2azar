import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import type { AuthUserPayload } from '@/src/lib/auth/rbac';
import type { NexaBusiness } from '@/src/types/business';

export const PREVIEW_SESSION_TOKEN = 'nexa_preview_admin_session_v1';

const PREVIEW_ADMIN_LOGIN = 'admin';
const PREVIEW_ADMIN_MOBILE = '09120000000';
const PREVIEW_ADMIN_PASSWORD = 'ChangeMe123!';

/**
 * True ONLY when DATABASE_URL is not configured at all (UI preview before DB deployment).
 * As soon as DATABASE_URL is set, this returns false and all routes strictly use PostgreSQL.
 */
export function isUnconfiguredDbPreview(): boolean {
  return !process.env.DATABASE_URL?.trim();
}

export function matchesPreviewAdminCredentials(login: string, mobile: string | null, password: string): boolean {
  const normalizedLogin = login.trim().toLowerCase();
  const loginMatches =
    normalizedLogin === PREVIEW_ADMIN_LOGIN ||
    mobile === PREVIEW_ADMIN_MOBILE ||
    normalizedLogin === PREVIEW_ADMIN_MOBILE;
  return loginMatches && password === PREVIEW_ADMIN_PASSWORD;
}

export const PREVIEW_ADMIN_USER: AuthUserPayload = {
  id: 'preview-admin',
  username: PREVIEW_ADMIN_LOGIN,
  mobilePhone: PREVIEW_ADMIN_MOBILE,
  displayName: 'مدیر سیستم',
  status: 'active',
  mustChangePassword: false,
  avatarFileKey: null,
  avatarUrl: null,
  systemRole: {
    id: 'role-super-admin',
    slug: 'super_admin',
    nameFa: 'مدیر کل سیستم',
    level: 100,
    permissions: { '*': true },
  },
};

export const PREVIEW_DEFAULT_BUSINESS: NexaBusiness = {
  id: 'preview-business',
  name: 'کسب‌وکار پیش‌فرض نکساپوینت',
  role: 'owner',
  plan: 'active',
  createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
  creditLabel: 'پیش‌نمایش',
};

function getCookieName(): string {
  return process.env.AUTH_SESSION_COOKIE?.trim() || 'nexa_session';
}

function resolvePreviewCookieOptions(req: Pick<NextRequest, 'headers' | 'nextUrl'>) {
  const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  const origin = req.headers.get('origin') ?? '';
  const secure =
    forwardedProto === 'https' ||
    req.nextUrl.protocol === 'https:' ||
    origin.startsWith('https://');
  const sameSite: 'none' | 'lax' = secure ? 'none' : 'lax';
  return { secure, sameSite };
}

export function hasValidPreviewSession(req: NextRequest): boolean {
  if (!isUnconfiguredDbPreview()) return false;
  return req.cookies.get(getCookieName())?.value === PREVIEW_SESSION_TOKEN;
}

export async function setPreviewSessionCookie(req: NextRequest): Promise<void> {
  const { secure, sameSite } = resolvePreviewCookieOptions(req);
  const store = await cookies();
  store.set({
    name: getCookieName(),
    value: PREVIEW_SESSION_TOKEN,
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearPreviewSessionCookie(req: NextRequest): Promise<void> {
  const { secure, sameSite } = resolvePreviewCookieOptions(req);
  const store = await cookies();
  store.set({
    name: getCookieName(),
    value: '',
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: 0,
  });
}
