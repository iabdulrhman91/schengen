import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { authConfig } from "./auth.config"
import { compare } from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const username = credentials?.username as string;
        const password = credentials?.password as string;

        if (!username || !password) return null;

        // DB access only happens on the server, never in the middleware
        const { storage } = await import("@/lib/storage");

        const user = await storage.getUserByUsername(username);
        if (!user || !user.password) return null;

        const isValid = (await compare(password, user.password).catch(() => false)) || (password === user.password);
        if (!isValid) return null;

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
})
