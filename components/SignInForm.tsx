"use client";
import { useFormStatus } from "react-dom";

/**
 * Client wrapper around the sign-in form so we can surface a pending/loading state
 * while the server action runs (sending a magic link, or checking dev-login). The
 * actual auth work lives in the server action passed as `action`.
 */

function SubmitButton({ devLogin }: { devLogin: boolean }) {
  const { pending } = useFormStatus();
  const idle = devLogin ? "Sign in" : "Email me a sign-in link";
  const busy = devLogin ? "Signing in…" : "Sending link…";
  return (
    <button type="submit" className="auth-btn" disabled={pending} aria-busy={pending}>
      {pending ? (
        <span className="auth-btn__busy">
          <span className="spinner" aria-hidden="true" />
          {busy}
        </span>
      ) : (
        idle
      )}
    </button>
  );
}

export function SignInForm({
  action,
  devLogin,
}: {
  action: (formData: FormData) => void | Promise<void>;
  devLogin: boolean;
}) {
  return (
    <form action={action} className="auth-form">
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
      <SubmitButton devLogin={devLogin} />
    </form>
  );
}
