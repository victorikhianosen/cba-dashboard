import { notFound } from "next/navigation";
import { getAuditTrailAction } from "@/actions/audit.action";
import { requirePermission } from "@/lib/requirePermission";
import AuditLogDetail from "./components/AuditLogDetail";

interface AuditLogDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AuditLogDetailPage({ params }: AuditLogDetailPageProps) {
  await requirePermission("view_audit_trails");

  const { id } = await params;

  const result: any = await getAuditTrailAction(id);

  if (result?.status !== "success" || !result?.data) {
    notFound();
  }

  return <AuditLogDetail log={result.data} />;
}
