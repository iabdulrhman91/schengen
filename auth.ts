import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { storage } from "@/lib/storage"
import { compare } from "bcryptjs"
import { User, Role } from "@/lib/storage/types"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
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

        // In a real app with hashed passwords:
        const isValid = await compare(password, user.password)
        if (!isValid) return null;

        // Return user without password
        return {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
          agencyId: user.agencyId
        } as any
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.username = (user as any).username
        token.role = (user as any).role
        token.agencyId = (user as any).agencyId
      }
      return token
    },
    async session({ session, token }) {
      if (token && token.id) {
        // Re-fetch user to get latest Role updates immediately
        // This prevents stale session data if role changes in DB
        const latestUser = await storage.getUserById(token.id as string);

        session.user.id = token.id as string;
        if (latestUser) {
          session.user.role = latestUser.role; // Fresh Role
          session.user.agencyId = latestUser.agencyId;
          session.user.username = latestUser.username;
        } else {
          // Fallback to token if user not found (should not happen)
          session.user.role = token.role as Role;
          session.user.agencyId = token.agencyId as string | undefined;
          session.user.username = token.username as string;
        }
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
  }
})
