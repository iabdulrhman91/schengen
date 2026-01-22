import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { storage } from "@/lib/storage"
import { compare } from "bcryptjs"
import { Role } from "@/lib/storage/types"

export const { handlers, signIn, signOut, auth } = NextAuth({
  debug: process.env.NODE_ENV === "development",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const username = credentials?.username as string
        const password = credentials?.password as string

        if (!username || !password) return null

        const user = await storage.getUserByUsername(username)
        if (!user || !user.password) return null

        // Support both hashed and plain text for initial setup
        const isValid = (await compare(password, user.password).catch(() => false)) || (password === user.password);

        if (!isValid) return null;

        // Ensure we return an object with a clear 'id' property
        return {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
          agencyId: user.agencyId
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Step 1: When user logs in, copy user.id to token.id
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.role = (user as any).role;
        token.agencyId = (user as any).agencyId;
      }
      return token;
    },
    async session({ session, token }) {
      // Step 2: Ensure session.user.id is correctly mapped from token.id
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.agencyId = token.agencyId as string | undefined;
        session.user.username = token.username as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  trustHost: true
})
