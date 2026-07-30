import { notFound } from "next/navigation";
import { getJournalEntryAction } from "@/actions/journal-entry.action";
import { requirePermission } from "@/lib/requirePermission";
import JournalEntryDetail from "./components/JournalEntryDetail";

interface JournalEntryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function JournalEntryDetailPage({ params }: JournalEntryDetailPageProps) {
  await requirePermission("view_general_ledgers");

  const { id } = await params;

  const result: any = await getJournalEntryAction(id);

  if (result?.status !== "success" || !result?.data) {
    notFound();
  }

  return <JournalEntryDetail entry={result.data} />;
}
