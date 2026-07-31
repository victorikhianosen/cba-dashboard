import { getAuditTrailsAction } from "@/actions/audit.action";
import { requirePermission } from "@/lib/requirePermission";
import AuditLogManagement from "./components/AuditLogManagement";

export default async function AuditLogsPage() {
  await requirePermission("view_audit_trails");

  const result: any = await getAuditTrailsAction(1);
  const logs = Array.isArray(result?.data) ? result.data : [];

  return (
    <AuditLogManagement
      initialLogs={logs}
      initialMeta={result?.meta ?? null}
    />
  );
}
