import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { buildDashboardPayload } from "@/lib/data/payload";
import { DashboardClient } from "@/components/DashboardClient";
import { DashboardError } from "@/components/DashboardError";

// Always render fresh on the server; SWR handles client-side polling from there.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  try {
    // Server-fetch already-tenant-scoped data (Phase 3) + aggregates/alerts (Phase 2).
    const initial = await buildDashboardPayload(session);
    return <DashboardClient initial={initial} userName={session.user.displayName ?? session.user.email ?? ""} />;
  } catch (err) {
    return (
      <DashboardError
        message={err instanceof Error ? err.message : "We couldn't reach the credentialing sheet."}
      />
    );
  }
}
