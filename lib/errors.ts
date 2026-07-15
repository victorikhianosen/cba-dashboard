import { toast } from "react-toastify";

// Laravel-style validation errors come back as
// { message: "Validation failed.", errors: { field: ["specific message"] } }.
// The generic "message" isn't useful on its own — prefer the first field
// error when present, falling back to message/fallback otherwise.
export function getErrorMessage(result: any, fallback: string): string {
  const firstFieldError = result?.errors
    ? Object.values(result.errors).flat().find(Boolean)
    : undefined;

  return (firstFieldError as string) || result?.message || fallback;
}

// The backend returns this whenever the token is missing/expired/revoked.
// authApiClient already destroys the session cookie server-side the moment
// this happens; this just tells the current page to notice.
export function isUnauthenticated(result: any): boolean {
  return result?.responseCode === "401";
}

// Drop-in replacement for `toast.error(getErrorMessage(result, fallback))`.
// Every authenticated API call in the app goes through this on failure, so
// it's the one place that needs to know about session expiry: if the token
// was rejected, skip the generic toast and send the user straight to login
// instead of leaving them stuck on a page where every action will now fail.
export function handleApiError(result: any, fallback: string) {
  if (isUnauthenticated(result)) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return;
  }

  toast.error(getErrorMessage(result, fallback));
}
