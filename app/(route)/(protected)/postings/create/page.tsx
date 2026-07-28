import { requirePermission } from "@/lib/requirePermission";
import CreatePostingPage from "./components/CreatePostingPage";

export default async function PostingCreatePage() {
  await requirePermission("create_postings");

  return <CreatePostingPage />;
}
