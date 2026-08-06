import { listPartialLiquidationsAction } from "@/actions/investment.action";
import { requirePermission } from "@/lib/requirePermission";
import PartialLiquidationManagement from "./components/PartialLiquidationManagement";

export default async function PartialLiquidationsPage() {
  await requirePermission("view_investments");

  const result: any = await listPartialLiquidationsAction(1);

  const liquidations = Array.isArray(result?.data) ? result.data : [];

  return (
    <PartialLiquidationManagement
      initialLiquidations={liquidations}
      initialMeta={result?.meta ?? null}
    />
  );
}
