import { notFound } from "next/navigation";
import { getFundGlAction } from "@/actions/fund-gl.action";
import { requirePermission } from "@/lib/requirePermission";
import FundGlDetail from "./components/FundGlDetail";

interface FundGlDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function FundGlDetailPage({ params }: FundGlDetailPageProps) {
  await requirePermission("view_fund_gls");

  const { id } = await params;

  const result: any = await getFundGlAction(id);

  if (result?.status !== "success" || !result?.data) {
    notFound();
  }

  return <FundGlDetail fundGl={result.data} />;
}
