import { getUserJourneySessionsAction } from "@/actions/journey.action";
import { requirePermission } from "@/lib/requirePermission";
import UserJourneyManagement from "./components/UserJourneyManagement";

export default async function UserJourneysPage() {
  await requirePermission("view_user_journeys");

  const result: any = await getUserJourneySessionsAction(1);
  const sessions = Array.isArray(result?.data) ? result.data : [];

  return (
    <UserJourneyManagement
      initialSessions={sessions}
      initialMeta={result?.meta ?? null}
    />
  );
}
