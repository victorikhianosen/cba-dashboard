import { getBranchesAction } from "@/actions/branch.action";
import { requirePermission } from "@/lib/requirePermission";
import BranchManagement from "./components/BranchManagement";

export default async function BranchPage() {
  await requirePermission("view_branches");

  const result: any = await getBranchesAction(1);
  const branches = Array.isArray(result?.data) ? result.data : [];

  return (
    <BranchManagement
      initialBranches={branches}
      initialMeta={result?.meta ?? null}
    />
  );
}