import { getCashierSessionsAction } from "@/actions/cashier-session.action";
import { requirePermission } from "@/lib/requirePermission";
import ReconciliationQueue from "./components/ReconciliationQueue";

export default async function ReconciliationPage() {
  await requirePermission("approve_cashier_variance");

  const sessionsResult: any = await getCashierSessionsAction(1, "pending_variance_approval");
  const sessions = Array.isArray(sessionsResult?.data) ? sessionsResult.data : [];

  return <ReconciliationQueue initialSessions={sessions} />;
}
