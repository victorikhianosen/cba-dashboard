import { notFound } from "next/navigation";
import { getPostingAction } from "@/actions/posting.action";
import { requirePermission } from "@/lib/requirePermission";
import PostingDetail from "./components/PostingDetail";

interface PostingDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PostingDetailPage({ params }: PostingDetailPageProps) {
  await requirePermission("view_postings");

  const { id } = await params;

  const result: any = await getPostingAction(id);

  if (result?.status !== "success" || !result?.data) {
    notFound();
  }

  return <PostingDetail posting={result.data} />;
}
