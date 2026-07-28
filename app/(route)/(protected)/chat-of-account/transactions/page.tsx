import { requirePermission } from "@/lib/requirePermission";
import TransactionsManagement from "./components/TransactionsManagement";

export default async function TransactionsPage() {
  await requirePermission("view_general_ledgers");

  return <TransactionsManagement />;
}
