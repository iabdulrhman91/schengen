import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const protectedPaths = ['/', '/requests', '/appointments', '/admin'];
  const isProtected = protectedPaths.some(p => pathname === p || pathname.startsWith(p + '/'));

  if (isProtected && !isLoggedIn) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && pathname === '/login') {
    return Response.redirect(new URL("/requests", req.nextUrl));
  }
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
