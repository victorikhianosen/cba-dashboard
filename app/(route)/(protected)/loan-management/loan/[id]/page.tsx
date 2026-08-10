import { notFound } from "next/navigation";
import { getLoanAction } from "@/actions/loan.action";
import { requirePermission } from "@/lib/requirePermission";
import LoanDetail from "./components/LoanDetail";

interface LoanDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LoanDetailPage({ params }: LoanDetailPageProps) {
  await requirePermission("view_loans");

  const { id } = await params;

  const result: any = await getLoanAction(id);

  if (result?.status !== "success" || !result?.data) {
    notFound();
  }

  return <LoanDetail loan={result.data} />;
}
