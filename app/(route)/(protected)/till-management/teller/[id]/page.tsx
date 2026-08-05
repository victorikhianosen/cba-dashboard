import { notFound } from "next/navigation";
import { getTellerAction } from "@/actions/teller.action";
import { requirePermission } from "@/lib/requirePermission";
import TellerDetail from "./components/TellerDetail";

export default async function TellerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("view_tellers");

  const { id } = await params;
  const result: any = await getTellerAction(id);

  if (result?.status !== "success" || !result?.data) {
    notFound();
  }

  return <TellerDetail teller={result.data} />;
}
