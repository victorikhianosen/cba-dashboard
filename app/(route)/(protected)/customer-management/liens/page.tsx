import { getLiensAction } from "@/actions/account-lien.action";
import { requirePermission } from "@/lib/requirePermission";
import LienManagement from "./components/LienManagement";

export default async function LiensPage() {
  await requirePermission("view_liens");

  const result: any = await getLiensAction(1);
  const liens = Array.isArray(result?.data) ? result.data : [];
  const meta = result?.meta ?? null;

  return <LienManagement initialLiens={liens} initialMeta={meta} />;
}
