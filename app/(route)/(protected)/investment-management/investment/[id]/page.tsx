import { notFound } from "next/navigation";
import { getInvestmentAction } from "@/actions/investment.action";
import { requirePermission } from "@/lib/requirePermission";
import InvestmentDetail from "./components/InvestmentDetail";

interface InvestmentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvestmentDetailPage({ params }: InvestmentDetailPageProps) {
  await requirePermission("view_investments");

  const { id } = await params;

  const result: any = await getInvestmentAction(id);

  if (result?.status !== "success" || !result?.data) {
    notFound();
  }

  return <InvestmentDetail investment={result.data} />;
}
