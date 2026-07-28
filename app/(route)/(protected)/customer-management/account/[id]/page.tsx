import { notFound } from "next/navigation";
import { getAccountAction } from "@/actions/account.action";
import { requirePermission } from "@/lib/requirePermission";
import AccountDetail from "./components/AccountDetail";

interface AccountDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AccountDetailPage({ params }: AccountDetailPageProps) {
  await requirePermission("view_accounts");

  const { id } = await params;

  const result: any = await getAccountAction(id);

  if (result?.status !== "success" || !result?.data) {
    notFound();
  }

  return <AccountDetail account={result.data} />;
}
