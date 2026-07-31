"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { sessionTimeoutAction } from "@/actions/auth.action";

// Log the user out this long before the token actually expires, instead of
// waiting for an API call to start failing with 401s.
const EARLY_LOGOUT_BUFFER_MS = 60 * 1000;

function readExpiresAtCookie(): number | null {
  const match = document.cookie.match(/(?:^|;\s*)banq_token_expires_at=(\d+)/);
  return match ? Number(match[1]) : null;
}

export default function SessionGuard() {
  const router = useRouter();
  const loggedOutRef = useRef(false);

  useEffect(() => {
    const expiresAt = readExpiresAtCookie();
    if (!expiresAt) return;

    const logoutAt = expiresAt - EARLY_LOGOUT_BUFFER_MS;
    const msUntilLogout = logoutAt - Date.now();

    async function autoLogout() {
      if (loggedOutRef.current) return;
      loggedOutRef.current = true;

      await sessionTimeoutAction();
      toast.info("Your session has expired. Please log in again.");
      router.replace("/login");
      router.refresh();
    }

    if (msUntilLogout <= 0) {
      autoLogout();
      return;
    }

    const timer = setTimeout(autoLogout, msUntilLogout);
    return () => clearTimeout(timer);
  }, [router]);

  return null;
}
