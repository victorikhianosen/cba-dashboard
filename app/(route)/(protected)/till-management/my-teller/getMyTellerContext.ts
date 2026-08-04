import { getMyCashierSessionAction } from "@/actions/cashier-session.action";
import { getTellersAction } from "@/actions/teller.action";
import { getCurrentUserCached } from "@/lib/current-user";

// Shared by the "My Teller" hub page and each full-page action (deposit/withdraw/buy/sell)
// — resolves the current cashier's assigned teller and their in-progress session, if any.
export async function getMyTellerContext() {
  const currentUser = await getCurrentUserCached();

  const [sessionResult, tellersResult]: any[] = await Promise.all([
    getMyCashierSessionAction(),
    getTellersAction(1, 500),
  ]);

  const tellers = Array.isArray(tellersResult?.data) ? tellersResult.data : [];
  const myTeller = tellers.find(
    (teller: any) => String(teller.current_assignment?.user_id) === String(currentUser?.id)
  );

  return {
    session: sessionResult?.status === "success" ? sessionResult.data : null,
    myTeller: myTeller ?? null,
  };
}
