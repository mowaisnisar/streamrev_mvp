import { signIn, auth, devLoginEnabled } from "@/lib/auth/auth";
import { redirect } from "next/navigation";

/**
 * Passwordless sign-in. Submitting the form sends a magic link via Resend.
 * Unknown emails are rejected in the signIn callback (no self-provisioning);
 * the `error` query param surfaces a clear message.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { error } = await searchParams;

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <span className="auth-brand">StreamRev</span>
        <h1 className="auth-title">Credentialing Dashboard</h1>
        <p className="auth-sub">
          Sign in with your work email. We&rsquo;ll send you a secure magic link — no password
          needed.
        </p>

        {error && (
          <div className="auth-error" role="alert">
            {error === "AccessDenied"
              ? "That email isn't set up for access. Contact your StreamRev specialist to be added."
              : "Something went wrong sending your link. Please try again."}
          </div>
        )}

        <form
          action={async (formData) => {
            "use server";
            const email = String(formData.get("email") ?? "").trim();
            if (devLoginEnabled) {
              // Dev/MVP: email-only sign-in, no magic link.
              await signIn("dev-login", { email, redirectTo: "/dashboard" });
            } else {
              await signIn("resend", { email, redirectTo: "/dashboard" });
            }
          }}
          className="auth-form"
        >
          <label htmlFor="email" className="auth-label">
            Work email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@yourgroup.com"
            className="auth-input"
          />
          <button type="submit" className="auth-btn">
            {devLoginEnabled ? "Sign in" : "Email me a sign-in link"}
          </button>
        </form>

        {devLoginEnabled && (
          <div className="banner banner--warn" style={{ marginTop: 0 }}>
            Dev login is on — any email listed in ClientAccess signs in instantly, no email sent.
            Turn off <code>ALLOW_DEV_LOGIN</code> before production.
          </div>
        )}

        <p className="auth-foot">
          Access is limited to registered StreamRev clients. You&rsquo;ll only ever see your own
          providers.
        </p>
      </div>
    </main>
  );
}
