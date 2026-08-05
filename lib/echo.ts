"use client";

import Echo from "laravel-echo";
import Pusher from "pusher-js";

let echoInstance: Echo<"reverb"> | null = null;

// Singleton — one live WebSocket connection for the whole authenticated session,
// created once (by NotificationProvider) and reused everywhere, instead of a new
// connection per page/component.
export function getEcho(): Echo<"reverb"> {
  if (echoInstance) return echoInstance;

  (window as any).Pusher = Pusher;

  echoInstance = new Echo({
    broadcaster: "reverb",
    key: process.env.NEXT_PUBLIC_REVERB_APP_KEY,
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST,
    wsPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080),
    wssPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080),
    forceTLS: process.env.NEXT_PUBLIC_REVERB_SCHEME === "https",
    enabledTransports: ["ws", "wss"],
    // The token behind /broadcasting/auth is an httpOnly cookie the browser
    // can't read — route the channel-auth handshake through our own server-side
    // proxy (app/api/broadcasting/auth) instead of hitting the Laravel API directly.
    authEndpoint: "/api/broadcasting/auth",
  });

  return echoInstance;
}

export function disconnectEcho() {
  echoInstance?.disconnect();
  echoInstance = null;
}
