import { notFound } from "next/navigation";
import { getLienAction } from "@/actions/account-lien.action";
import { requirePermission } from "@/lib/requirePermission";
import LienDetail from "./components/LienDetail";

export default async function LienDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("view_liens");

  const { id } = await params;
  const result: any = await getLienAction(id);

  if (result?.status !== "success" || !result?.data) {
    notFound();
  }

  return <LienDetail lien={result.data} />;
}
