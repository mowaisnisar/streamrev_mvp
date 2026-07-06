/** Full-page error state in the app's own voice when the sheet can't be reached. */
export function DashboardError({ message }: { message: string }) {
  return (
    <main className="auth-shell">
      <div className="auth-card">
        <span className="auth-brand">StreamRev</span>
        <h1 className="auth-title">We couldn&rsquo;t reach the sheet</h1>
        <p className="auth-sub">
          The credentialing data source didn&rsquo;t respond. This is usually a temporary
          connection or configuration issue.
        </p>
        <div className="banner banner--error" style={{ marginTop: 0 }}>
          {message}
        </div>
        <a href="/dashboard" className="auth-btn" style={{ marginTop: "1rem" }}>
          Try again
        </a>
      </div>
    </main>
  );
}
