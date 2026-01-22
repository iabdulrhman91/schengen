import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    pages: {
        signIn: '/login',
        error: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnProtected = ['/requests', '/appointments', '/admin'].some(p =>
                nextUrl.pathname === p || nextUrl.pathname.startsWith(p + '/')
            );

            if (isOnProtected) {
                if (isLoggedIn) return true;
                return false; // Redirect to login
            } else if (isLoggedIn && nextUrl.pathname === '/login') {
                return Response.redirect(new URL('/requests', nextUrl));
            }
            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.username = (user as any).username;
                token.role = (user as any).role;
                token.agencyId = (user as any).agencyId;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = (token as any).role;
                session.user.agencyId = (token as any).agencyId;
                session.user.username = (token as any).username;
            }
            return session;
        }
    },
    providers: [], // Empty here, will be populated in auth.ts
    trustHost: true
} satisfies NextAuthConfig;
