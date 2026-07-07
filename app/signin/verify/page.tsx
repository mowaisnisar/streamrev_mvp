export default function VerifyRequestPage() {
  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo__mark" aria-hidden="true" />
          <span className="auth-logo__word">StreamRev</span>
        </div>

        <h1 className="auth-title">Check your email</h1>
        <p className="auth-sub">
          We&rsquo;ve sent a secure sign-in link to your inbox. Open it on this device to continue
          — the link expires shortly, so it&rsquo;s best to use it right away.
        </p>

        <div className="auth-divider" />
        <p className="auth-foot">
          Didn&rsquo;t receive it? Check your spam folder, or head back and request a new link.
        </p>
        <a href="/signin" className="auth-btn auth-btn--ghost" style={{ marginTop: "0.9rem" }}>
          Back to sign-in
        </a>
      </div>
    </main>
  );
}
