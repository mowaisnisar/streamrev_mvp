import type { Role } from "@/types/credentialing";
import type { DefaultSession } from "next-auth";

// Augment the session with StreamRev tenancy fields resolved from ClientAccess.
declare module "next-auth" {
  interface Session {
    user: {
      clientId: string;
      role: Role;
      displayName: string | null;
    } & DefaultSession["user"];
  }
}

// Tenancy is carried on the JWT (we use the jwt session strategy).
declare module "next-auth/jwt" {
  interface JWT {
    clientId?: string;
    role?: Role;
    displayName?: string | null;
  }
}
