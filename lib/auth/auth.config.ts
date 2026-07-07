import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config: pages + the `authorized` gate used by middleware.
 * Providers live in auth.ts (the Node runtime) so provider `authorize` handlers
 * can safely use googleapis/server-only without leaking into the edge bundle.
 */
export const authConfig = {
  // Trust the host/proxy header on Vercel (and any reverse-proxied deploy).
  // Without this, Auth.js throws `UntrustedHost` when the request host differs
  // from AUTH_URL/NEXTAUTH_URL — which surfaces as a bare, unstyled 500 page.
  trustHost: true,
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
