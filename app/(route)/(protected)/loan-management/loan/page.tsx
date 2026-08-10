import { requirePermission } from "@/lib/requirePermission";
import { getLoansAction } from "@/actions/loan.action";
import LoanManagement from "./components/LoanManagement";

export default async function LoanPage() {
  await requirePermission("view_loans");

  const result: any = await getLoansAction(1);

  const loans = Array.isArray(result?.data) ? result.data : [];

  return <LoanManagement initialLoans={loans} initialMeta={result?.meta ?? null} />;
}
