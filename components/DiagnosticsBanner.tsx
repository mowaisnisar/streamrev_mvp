/** Non-fatal schema diagnostics (Phase 8): missing columns / unknown status values. */
export function DiagnosticsBanner({
  missingHeaders,
  unknownStatuses,
}: {
  missingHeaders: string[];
  unknownStatuses: string[];
}) {
  if (missingHeaders.length === 0 && unknownStatuses.length === 0) return null;
  return (
    <div className="banner banner--warn" role="status">
      {missingHeaders.length > 0 && (
        <div>
          <strong>Heads up:</strong> the sheet is missing expected column
          {missingHeaders.length > 1 ? "s" : ""}: {missingHeaders.join(", ")}. Those fields show
          as blank.
        </div>
      )}
      {unknownStatuses.length > 0 && (
        <div>
          Unrecognized credentialing status value{unknownStatuses.length > 1 ? "s" : ""}:{" "}
          {unknownStatuses.join(", ")}. They&rsquo;re treated as &ldquo;Not Started&rdquo; in the
          pipeline.
        </div>
      )}
    </div>
  );
}
