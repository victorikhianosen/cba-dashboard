import { notFound } from "next/navigation";
import { getTransactionAction } from "@/actions/transaction.action";
import { requirePermission } from "@/lib/requirePermission";
import TransactionDetail from "./components/TransactionDetail";

interface TransactionDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TransactionDetailPage({ params }: TransactionDetailPageProps) {
  await requirePermission("view_general_ledgers");

  const { id } = await params;

  const result: any = await getTransactionAction(id);

  if (result?.status !== "success" || !result?.data) {
    notFound();
  }

  return <TransactionDetail transaction={result.data} />;
}
