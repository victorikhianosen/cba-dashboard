import {
  type ReactNode,
} from "react";

import { getCurrentUserCached } from "@/lib/current-user";
import { PermissionsProvider } from "@/lib/permissions";
import ClientShell from "./ClientShell";

interface ClientLayoutProps {
  children: ReactNode;
}

export default async function ClientLayout({
  children,
}: ClientLayoutProps) {
  // Refetched on every request so a permission/role change made by an admin
  // takes effect on the next page load without the user having to log out.
  const currentUser = await getCurrentUserCached();

  return (
    <PermissionsProvider currentUser={currentUser}>
      <ClientShell>
        {children}
      </ClientShell>
    </PermissionsProvider>
  );
}
