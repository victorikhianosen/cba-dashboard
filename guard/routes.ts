export const AUTH_COOKIE_NAME = "banq_token";

// Routes a logged-in user should not see (they get bounced to /dashboard).
// Everything else is treated as protected and requires the auth cookie.
export const publicRoutes = ["/", "/login", "/verify-2fa"];

export const defaultAuthenticatedRoute = "/dashboard";
export const defaultUnauthenticatedRoute = "/login";
