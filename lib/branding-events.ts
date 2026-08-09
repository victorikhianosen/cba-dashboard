// Sidebar fetches branding (logo/company name) once on mount — without this, saving a
// change on the System Settings page would only show up for other users/tabs after a
// reload, since there's no shared state between that page and the Sidebar. Dispatching
// this event lets any mounted Sidebar refetch immediately after a successful save.
export const BRANDING_UPDATED_EVENT = "banq:branding-updated";

export function emitBrandingUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(BRANDING_UPDATED_EVENT));
  }
}
