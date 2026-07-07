import { AuthError } from "next-auth";
import { signIn, auth, devLoginEnabled } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/SignInForm";

/**
 * Passwordless sign-in. Submitting the form sends a magic link via Resend (prod) or,
 * with ALLOW_DEV_LOGIN=true, signs in instantly for any email in the ClientAccess tab.
 * Unknown emails are rejected (no self-provisioning); the `error` query param surfaces
 * a clear, human message instead of an unhandled 500 / "Application error" page.
 */

/** Map an Auth.js error type (or ?error= value) to a friendly, on-brand message. */
function errorMessage(error: string): string {
  switch (error) {
    // signIn callback returned false (magic-link click for an unknown email).
    case "AccessDenied":
    // Credentials (dev-login) authorize() returned null — email not in ClientAccess.
    case "CredentialsSignin":
      return "That email isn't set up for access yet. Double-check the address, or contact your StreamRev specialist to be added.";
    // Adapter / email transport misconfigured (e.g. Upstash or Resend not set up).
    case "Configuration":
    case "EmailSignInError":
      return "We couldn't send your sign-in link right now. Please try again in a moment, or contact your StreamRev specialist.";
    default:
      return "Something went wrong signing you in. Please try again.";
  }
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { error } = await searchParams;

  async function submit(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim();
    try {
      if (devLoginEnabled) {
        // Dev/MVP: email-only sign-in, no magic link.
        await signIn("dev-login", { email, redirectTo: "/dashboard" });
      } else {
        await signIn("resend", { email, redirectTo: "/dashboard" });
      }
    } catch (err) {
      // A *successful* sign-in throws a Next redirect (NEXT_REDIRECT) that must
      // propagate. Only Auth.js failures get turned into a friendly error page.
      if (err instanceof AuthError) {
        redirect(`/signin?error=${encodeURIComponent(err.type)}`);
      }
      throw err;
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo__mark" aria-hidden="true" />
          <span className="auth-logo__word">StreamRev</span>
        </div>

        <h1 className="auth-title">Sign in to your dashboard</h1>
        <p className="auth-sub">
          {devLoginEnabled
            ? "Enter your work email to continue. Access is limited to approved StreamRev clients."
            : "Enter your work email and we’ll send you a secure sign-in link. No password to remember."}
        </p>

        {error && (
          <div className="auth-error" role="alert">
            <svg
              className="auth-error__icon"
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 7a1 1 0 112 0v4a1 1 0 11-2 0V7zm1 8a1.1 1.1 0 100-2.2 1.1 1.1 0 000 2.2z"
                clipRule="evenodd"
              />
            </svg>
            <span>{errorMessage(error)}</span>
          </div>
        )}

        <SignInForm action={submit} devLogin={devLoginEnabled} />

        {devLoginEnabled && (
          <div className="dev-note" role="note">
            <span className="dev-note__dot" aria-hidden="true" />
            Developer mode is on — approved emails sign in instantly without an email link.
          </div>
        )}

        <div className="auth-divider" />
        <p className="auth-foot">
          Access is limited to registered StreamRev clients. You&rsquo;ll only ever see the
          providers assigned to your organization.
        </p>
      </div>
    </main>
  );
}
