import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { UpstashRedisAdapter } from "@auth/upstash-redis-adapter";
import { Redis } from "@upstash/redis";
import { authConfig } from "@/lib/auth/auth.config";
import { findAccess, findAccessFresh } from "@/lib/auth/access";

/** Dev-only, email-only login (no magic link). Enabled by ALLOW_DEV_LOGIN=true. */
export const devLoginEnabled = process.env.ALLOW_DEV_LOGIN === "true";

/**
 * Full Auth.js (NextAuth v5) instance. Magic-link email (Resend) needs an
 * adapter to persist verification tokens + sessions. We use Upstash Redis, which
 * is serverless-friendly on Vercel. See guide.md for setup.
 *
 * Tenancy: on every session read we resolve the signed-in email against the
 * ClientAccess tab and attach { clientId, role, displayName }. Unknown emails are
 * denied at sign-in.
 */

function buildAdapter() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    // Don't throw at import (it would break `next build`'s page-data collection).
    // Warn instead; magic-link sign-in will fail clearly at runtime until Upstash
    // is configured. See guide.md §6.
    console.warn(
      "[streamrev] Auth adapter NOT configured: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for magic-link sign-in. See guide.md.",
    );
    return undefined;
  }
  return UpstashRedisAdapter(new Redis({ url, token }));
}

/**
 * Providers. In production this is Resend magic-link only. In dev, setting
 * ALLOW_DEV_LOGIN=true adds an email-only Credentials provider so you can sign in
 * without sending email / configuring Upstash — the email must still exist in the
 * ClientAccess tab. NEVER set ALLOW_DEV_LOGIN=true in production.
 */
const providers = [
  Resend({
    // RESEND_API_KEY is read from env automatically; `from` must be a verified sender.
    from: process.env.EMAIL_FROM,
  }),
  ...(devLoginEnabled
    ? [
        Credentials({
          id: "dev-login",
          name: "Dev login (email only)",
          credentials: { email: { label: "Email", type: "email" } },
          async authorize(creds) {
            const email = String(creds?.email ?? "").trim().toLowerCase();
            // Fresh (uncached) read so a just-added ClientAccess email works immediately.
            const access = await findAccessFresh(email);
            if (!access) return null; // must be a known ClientAccess email
            return { id: email, email, name: access.display_name ?? email };
          },
        }),
      ]
    : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  // Adapter persists the magic-link verification tokens + user records. We use JWT
  // sessions (not database) so the edge middleware can verify the session cookie
  // without a DB round-trip. Dev-login (Credentials) needs no adapter.
  adapter: buildAdapter(),
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    // Deny sign-in for any email not present in ClientAccess (no self-provisioning).
    // Fresh read here too so newly-added emails aren't blocked by the sheet cache.
    async signIn({ user }) {
      const access = await findAccessFresh(user.email);
      return access != null;
    },
    // Resolve tenancy from the sheet and stamp it onto the JWT. Runs on sign-in and
    // on subsequent requests; reads are cached so this stays cheap and fresh.
    async jwt({ token }) {
      const access = await findAccess(token.email);
      token.clientId = access?.client_id ?? "";
      token.role = access?.role ?? "client";
      token.displayName = access?.display_name ?? null;
      return token;
    },
    // Copy tenancy from the token to the session the app reads.
    async session({ session, token }) {
      session.user.clientId = (token.clientId as string) ?? "";
      session.user.role = (token.role as "admin" | "client") ?? "client";
      session.user.displayName = (token.displayName as string | null) ?? null;
      return session;
    },
  },
});
