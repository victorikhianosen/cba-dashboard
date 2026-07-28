import { requirePermission } from "@/lib/requirePermission";
import FinancialTransactionsManagement from "./components/FinancialTransactionsManagement";

export default async function FinancialTransactionsPage() {
  await requirePermission("view_general_ledgers");

  return <FinancialTransactionsManagement />;
}
