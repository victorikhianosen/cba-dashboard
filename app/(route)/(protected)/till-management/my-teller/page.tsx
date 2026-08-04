import { requirePermission } from "@/lib/requirePermission";
import { getMyTellerContext } from "./getMyTellerContext";
import MyTellerPanel from "./components/MyTellerPanel";

export default async function MyTellerPage() {
  await requirePermission("operate_teller");

  const { session, myTeller } = await getMyTellerContext();

  return <MyTellerPanel initialSession={session} myTeller={myTeller} />;
}
