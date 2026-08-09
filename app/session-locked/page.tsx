import { getCurrentUserCached } from "@/lib/current-user";
import SessionLockedScreen from "./components/SessionLockedScreen";

// Root-level (outside the (protected) route group) so it carries none of that layout's
// Sidebar/Navbar/permission guards — middleware.ts rewrites here transparently while a
// session is locked, so this needs to render standalone regardless of what the user's
// actual permissions are for whatever page they were really on.
export default async function SessionLockedPage() {
  const currentUser = await getCurrentUserCached();

  return <SessionLockedScreen currentUser={currentUser} />;
}
