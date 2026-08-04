import { listLienApprovalsAction } from "@/actions/account-lien.action";
import { requirePermission } from "@/lib/requirePermission";
import LienApprovalQueue from "./components/LienApprovalQueue";

export default async function LienApprovalsPage() {
  await requirePermission("approve_liens");

  const result: any = await listLienApprovalsAction("pending");
  const liens = Array.isArray(result?.data) ? result.data : [];

  return <LienApprovalQueue initialLiens={liens} />;
}
