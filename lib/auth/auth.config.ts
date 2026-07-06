import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config: pages + the `authorized` gate used by middleware.
 * Providers live in auth.ts (the Node runtime) so provider `authorize` handlers
 * can safely use googleapis/server-only without leaking into the edge bundle.
 */
export const authConfig = {
  pages: {
    signIn: "/signin",
    verifyRequest: "/signin/verify",
    error: "/signin",
  },
  providers: [],
  callbacks: {
    // Gate every route matched by middleware: must be signed in.
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
