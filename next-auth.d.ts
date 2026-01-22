import NextAuth from "next-auth"
import { Role } from "@/lib/storage/types"

declare module "next-auth" {
  interface User {
    id: string
    username: string
    role: Role
    agencyId?: string
  }

  interface Session {
    user: User
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string
    username: string
    role: Role
    agencyId?: string
  }
}
