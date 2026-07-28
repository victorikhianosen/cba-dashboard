import { requirePermission } from "@/lib/requirePermission";
import JournalEntriesManagement from "./components/JournalEntriesManagement";

export default async function JournalEntriesPage() {
  await requirePermission("view_general_ledgers");

  return <JournalEntriesManagement />;
}
