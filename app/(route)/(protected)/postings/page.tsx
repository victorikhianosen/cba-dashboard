import { getPostingsAction } from "@/actions/posting.action";
import { requirePermission } from "@/lib/requirePermission";
import PostingManagement from "./components/PostingManagement";

export default async function PostingsPage() {
  await requirePermission("view_postings");

  const result: any = await getPostingsAction(1);

  const postings = Array.isArray(result?.data) ? result.data : [];

  return <PostingManagement initialPostings={postings} initialMeta={result?.meta ?? null} />;
}
