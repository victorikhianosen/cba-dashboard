import { notFound } from "next/navigation";
import { getUserJourneyTimelineAction } from "@/actions/journey.action";
import { requirePermission } from "@/lib/requirePermission";
import UserJourneyTimeline from "./components/UserJourneyTimeline";

interface UserJourneyDetailPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function UserJourneyDetailPage({ params }: UserJourneyDetailPageProps) {
  await requirePermission("view_user_journeys");

  const { sessionId } = await params;

  const result: any = await getUserJourneyTimelineAction(sessionId);

  if (result?.status !== "success" || !Array.isArray(result?.data) || result.data.length === 0) {
    notFound();
  }

  return <UserJourneyTimeline sessionId={sessionId} events={result.data} />;
}
