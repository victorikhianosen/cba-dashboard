import { getPendingWithdrawalsAction } from "@/actions/cashier-session.action";
import { requirePermission } from "@/lib/requirePermission";
import WithdrawalApprovalQueue from "./components/WithdrawalApprovalQueue";

export default async function WithdrawalApprovalsPage() {
  await requirePermission("approve_teller_withdrawal");

  const result: any = await getPendingWithdrawalsAction(1);
  const withdrawals = Array.isArray(result?.data) ? result.data : [];

  return <WithdrawalApprovalQueue initialWithdrawals={withdrawals} />;
}
