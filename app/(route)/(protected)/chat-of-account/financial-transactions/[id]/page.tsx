import { notFound } from "next/navigation";
import { getFinancialTransactionAction } from "@/actions/financial-transaction.action";
import { requirePermission } from "@/lib/requirePermission";
import FinancialTransactionDetail from "./components/FinancialTransactionDetail";

interface FinancialTransactionDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function FinancialTransactionDetailPage({
  params,
}: FinancialTransactionDetailPageProps) {
  await requirePermission("view_general_ledgers");

  const { id } = await params;

  const result: any = await getFinancialTransactionAction(id);

  if (result?.status !== "success" || !result?.data) {
    notFound();
  }

  return <FinancialTransactionDetail transaction={result.data} />;
}
