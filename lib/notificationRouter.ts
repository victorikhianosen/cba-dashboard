// Maps a notification's `module` (set backend-side by whichever service fired it — see
// App\Services\Notification\NotificationService) to the URL its "subject_id" lives at.
// The backend deliberately doesn't know frontend routes; this is the one place that
// translates its opaque module+id pointer into somewhere to click through to. Add a new
// entry here whenever a new module starts firing notifications.
const NOTIFICATION_ROUTES: Record<string, (id: number | string) => string> = {
  lien: (id) => `/customer-management/liens/${id}`,
  posting: (id) => `/postings/${id}`,
  investment: (id) => `/investment-management/investment/${id}`,
  withdrawal: () => `/till-management/withdrawal-approvals`,
  variance: () => `/till-management/reconciliation`,
  customer: (id) => `/customer-management/customer/${id}`,
  account: (id) => `/customer-management/account/${id}`,
};

export function resolveNotificationUrl(module: string, subjectId: number | string): string | null {
  const resolver = NOTIFICATION_ROUTES[module];
  return resolver ? resolver(subjectId) : null;
}
