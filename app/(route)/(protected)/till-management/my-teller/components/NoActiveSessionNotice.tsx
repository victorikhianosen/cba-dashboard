import Link from "next/link";
import { AlertTriangle } from "lucide-react";

// Temporary diagnostic: shows exactly why an action page can't be used, instead of
// silently bouncing back to /my-teller — makes a real state mismatch visible instead of
// leaving the user guessing why the page "won't load".
export default function NoActiveSessionNotice({
  myTeller,
  session,
}: {
  myTeller: Record<string, any> | null;
  session: Record<string, any> | null;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="text-amber-600" size={24} />
        <h1 className="text-lg font-bold text-amber-900">This action isn't available right now</h1>
      </div>
      <div className="mt-4 space-y-1 text-sm text-amber-800">
        <p>Assigned teller found: <strong>{myTeller ? `Yes — ${myTeller.name} (${myTeller.code})` : "No"}</strong></p>
        <p>Session found: <strong>{session ? `Yes — status "${session.status}"` : "No"}</strong></p>
        <p>Session must be status <strong>&quot;open&quot;</strong> to deposit, withdraw, buy, or sell.</p>
      </div>
      <Link
        href="/till-management/my-teller"
        className="mt-4 inline-block rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
      >
        Back to My Teller
      </Link>
    </div>
  );
}
