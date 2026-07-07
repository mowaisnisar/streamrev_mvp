/** Full-page error state in the app's own voice when the sheet can't be reached. */
export function DashboardError({ message }: { message: string }) {
  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo__mark" aria-hidden="true" />
          <span className="auth-logo__word">StreamRev</span>
        </div>
        <h1 className="auth-title">We couldn&rsquo;t load your data</h1>
        <p className="auth-sub">
          The credentialing data source didn&rsquo;t respond. This is usually a temporary
          connection or configuration issue — trying again often resolves it.
        </p>
        <div className="banner banner--error" style={{ marginTop: 0 }}>
          {message}
        </div>
        <a href="/dashboard" className="auth-btn" style={{ marginTop: "1.1rem" }}>
          Try again
        </a>
      </div>
    </main>
  );
}
