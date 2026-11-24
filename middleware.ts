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

function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/businesses';
  return next;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/login')) {
    if (hasSessionCookie(req)) {
      const target = req.nextUrl.clone();
      target.pathname = safeNextPath(req.nextUrl.searchParams.get('next'));
      target.search = '';
      return NextResponse.redirect(target);
    }
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
  matcher: ['/login', '/dashboard/:path*', '/businesses/:path*'],
};
