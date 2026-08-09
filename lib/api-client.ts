"use server";

import { SESSION_LOCK_COOKIE_NAME } from "@/guard/session-lock-guard";
import { cookies } from "next/headers";

const baseURL = process.env.API_BASE_URL;

type RequestConfig = {
  endpoint: string;
  method?: string;
  body?: unknown;
};

// PUT/PATCH can't carry a multipart FormData body in most PHP backends
// (Laravel included) unless it's sent as POST with a `_method` override
// field, so form-data callers pass the "real" method separately.
function withMethodOverride(formData: FormData, method: string) {
  if (method !== "GET" && method !== "POST") {
    formData.append("_method", method);
  }
  return formData;
}

const SESSION_MAX_AGE_SECONDS = 45 * 60;

async function saveToken(token: string) {
  const cookieStore = await cookies();

  cookieStore.set("banq_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // maxAge: 2 * 60,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  // Readable (non-httpOnly) so the client can auto-logout shortly before the
  // real token expires, instead of waiting for an API call to start failing.
  cookieStore.set(
    "banq_token_expires_at",
    String(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
    {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    },
  );
}

async function request({ endpoint, method = "GET", body }: RequestConfig) {
  const response = await fetch(`${baseURL}${endpoint}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return parseApiResponse(response, endpoint);
}

// Every server action's catch block was returning the same generic "A network error
// occurred" message whenever this threw — which happened whenever the backend returned
// something that wasn't valid JSON (a raw PHP fatal error page, a crashed process, a
// proxy/500 HTML page), silently hiding the real backend error. This logs the actual
// status + response body server-side (visible in the `next dev`/server terminal) and
// returns it in the response instead of throwing, so callers see what actually happened.
async function parseApiResponse(response: Response, endpoint: string) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    console.error(
      `[api-client] Non-JSON response from ${endpoint} (status ${response.status}):\n${text.slice(0, 2000)}`,
    );

    return {
      status: "failed",
      responseCode: String(response.status),
      message: `Backend returned a non-JSON response (HTTP ${response.status}). See server logs for the full body.`,
      raw: text.slice(0, 500),
    };
  }
}

export async function publicApiClient(config: RequestConfig) {
  return request(config);
}

// 2. Updated here to read banq_token
export async function authApiClient(config: RequestConfig) {
  const cookieStore = await cookies();
  const token = cookieStore.get("banq_token")?.value;
  const method = config.method || "GET";
  const isFormData = config.body instanceof FormData;

  const response = await fetch(`${baseURL}${config.endpoint}`, {
    // Multipart requests get POSTed with a `_method` override field instead
    // of using PUT/DELETE directly — see withMethodOverride() above.
    method: isFormData ? "POST" : method,
    headers: isFormData
      ? {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        }
      : {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
    body: isFormData
      ? withMethodOverride(config.body as FormData, method)
      : config.body
        ? JSON.stringify(config.body)
        : undefined,
  });

  const result = await parseApiResponse(response, config.endpoint);

  // The backend rejected the token (missing/expired/revoked) — kill the
  // local session immediately so the app can't keep acting as if the user
  // is still logged in.
  if (response.status === 401 || result?.responseCode === "401") {
    await clearToken();
  }

  return result;
}

async function clearToken() {
  const cookieStore = await cookies();
  cookieStore.delete("banq_token");
  cookieStore.delete("banq_token_expires_at");
  // Otherwise a stale lock flag from this session could rewrite the very next login
  // (a different user, on a shared machine) straight to the session-locked screen.
  cookieStore.delete(SESSION_LOCK_COOKIE_NAME);
}

export async function saveOnboardingStatus(completed: boolean) {
  const cookieStore = await cookies();

  cookieStore.set("onboarding_completed", completed ? "true" : "false", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 45 * 60,
    // maxAge: 60 * 60 * 24,
  });
}

export { saveToken, clearToken };
