import { notFound } from "next/navigation";
import { getVirtualAccountAction } from "@/actions/virtual-account.action";
import { requirePermission } from "@/lib/requirePermission";
import VirtualAccountDetail from "./components/VirtualAccountDetail";

export default async function VirtualAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("view_virtual_accounts");

  const { id } = await params;
  const result: any = await getVirtualAccountAction(id);

  if (result?.status !== "success" || !result?.data) notFound();

  return <VirtualAccountDetail virtualAccount={result.data} />;
}
