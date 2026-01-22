import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // 1. Get Token (Edge compatible, relies on AUTH_SECRET)
  let token = null;
  try {
    token = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
      salt: process.env.AUTH_SECRET ? 'authjs.session-token' : undefined
    });
  } catch (e) {
    console.error("Middleware Token Error:", e);
  }

  const isLoggedIn = !!token;
  const { pathname } = req.nextUrl;

  // Define protected paths
  const protectedPaths = ['/', '/requests', '/appointments', '/admin'];
  const isProtected = protectedPaths.some(p => pathname === p || pathname.startsWith(p + '/'));

  // 2. Protect Routes
  if (isProtected) {
    if (isLoggedIn) return NextResponse.next();
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 3. Redirect Logged In Users from Login
  if (isLoggedIn && pathname === '/login') {
    return NextResponse.redirect(new URL('/requests', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
