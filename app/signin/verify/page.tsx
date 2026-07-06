export default function VerifyRequestPage() {
  return (
    <main className="auth-shell">
      <div className="auth-card">
        <span className="auth-brand">StreamRev</span>
        <h1 className="auth-title">Check your inbox</h1>
        <p className="auth-sub">
          We sent a secure sign-in link to your email. Open it on this device to continue. The
          link expires shortly for your security.
        </p>
        <p className="auth-foot">
          Didn&rsquo;t get it? Check spam, or return to sign-in and try again.
        </p>
        <a href="/signin" className="auth-btn auth-btn--ghost">
          Back to sign-in
        </a>
      </div>
    </main>
  );
}
