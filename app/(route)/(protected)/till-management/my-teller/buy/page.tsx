import { requirePermission } from "@/lib/requirePermission";
import { getMyTellerContext } from "../getMyTellerContext";
import NoActiveSessionNotice from "../components/NoActiveSessionNotice";
import TellerActionForm from "../components/TellerActionForm";

export default async function BuyPage() {
  await requirePermission("operate_teller");

  const { session, myTeller } = await getMyTellerContext();

  if (!myTeller || !session || session.status !== "open") {
    return <NoActiveSessionNotice myTeller={myTeller} session={session} />;
  }

  return <TellerActionForm action="buy" session={session} myTeller={myTeller} />;
}
