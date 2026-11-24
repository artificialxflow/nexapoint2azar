import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { MOCK_SESSION_COOKIE } from '@/src/lib/frontend-config';

const SESSION_COOKIE = process.env.AUTH_SESSION_COOKIE ?? 'nexa_session';
const FRONTEND_ONLY = process.env.NEXT_PUBLIC_FRONTEND_ONLY === 'true';

function hasSessionCookie(req: NextRequest): boolean {
  if (FRONTEND_ONLY) {
    return !!req.cookies.get(MOCK_SESSION_COOKIE)?.value;
  }
  return !!req.cookies.get(SESSION_COOKIE)?.value;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Do not redirect away from /login when a cookie exists — stale/invalid cookies
  // must still reach login; the login page redirects only after /api/auth/me succeeds.
  if (pathname.startsWith('/login')) {
    return NextResponse.next();
  }

  const isProtected =
    pathname.startsWith('/dashboard') || pathname.startsWith('/businesses');

  if (!isProtected) {
    return NextResponse.next();
  }

  if (!hasSessionCookie(req)) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/dashboard',
    '/dashboard/:path*',
    '/businesses',
    '/businesses/:path*',
  ],
};
