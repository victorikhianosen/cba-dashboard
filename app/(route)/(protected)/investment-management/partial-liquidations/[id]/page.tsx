import { getPartialLiquidationAction } from "@/actions/investment.action";
import { requirePermission } from "@/lib/requirePermission";
import PartialLiquidationDetail from "./components/PartialLiquidationDetail";

export default async function PartialLiquidationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("view_investments");

  const { id } = await params;
  const result: any = await getPartialLiquidationAction(id);

  return <PartialLiquidationDetail initialLiquidation={result?.data ?? null} liquidationId={id} />;
}
