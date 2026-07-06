import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";

// Edge-safe middleware: uses only the base config (no adapter). The `authorized`
// callback redirects unauthenticated users to /signin for any matched route.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Protect PAGES only. API routes are excluded — they run their own auth() check
  // and must return JSON/401 (not an HTML redirect) so SWR can consume them.
  // Also excludes Next internals, sign-in pages, and static assets.
  matcher: [
    "/((?!api|signin|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)",
  ],
};
