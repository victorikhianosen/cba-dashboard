import { getFundGlsAction } from "@/actions/fund-gl.action";
import { requirePermission } from "@/lib/requirePermission";
import FundGlManagement from "./components/FundGlManagement";

export default async function FundGlsPage() {
  await requirePermission("view_fund_gls");

  const result: any = await getFundGlsAction(1);

  const fundGls = Array.isArray(result?.data) ? result.data : [];

  return <FundGlManagement initialFundGls={fundGls} initialMeta={result?.meta ?? null} />;
}
