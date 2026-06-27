/**
 * =============================================================================
 * Realtime Socket (shared, authenticated)
 * =============================================================================
 *
 * A single app-wide Socket.IO connection used for server-pushed updates such
 * as booking lifecycle changes (`booking:changed`). It authenticates with the
 * stored JWT on the handshake — the same auth the backend signaling service
 * expects — and joins a per-user room server-side so updates are targeted.
 *
 * This is intentionally separate from the WebRTC signaling socket created
 * inside LiveInterviewRoom: that one is scoped to a single meeting room and
 * tears down when the call ends. This one lives for the whole session.
 */

import type { Socket } from "socket.io-client";
import { API_BASE_URL, SOCKET_IO_PATH, STORAGE_KEYS } from "./api-config";

let socketPromise: Promise<Socket | null> | null = null;

/**
 * Get (lazily creating) the shared authenticated socket. Returns null on the
 * server or when there is no auth token (logged out).
 */
export async function getRealtimeSocket(): Promise<Socket | null> {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  if (!token) return null;

  if (!socketPromise) {
    socketPromise = (async () => {
      const { io } = await import("socket.io-client");
      return io(API_BASE_URL, {
        path: SOCKET_IO_PATH,
        auth: { token },
        transports: ["websocket"],
        // socket.io reconnects automatically; these are sane defaults.
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
      });
    })();
  }

  return socketPromise;
}

/**
 * Disconnect and forget the shared socket. Call on logout so the next login
 * reconnects with a fresh token.
 */
export function resetRealtimeSocket(): void {
  if (socketPromise) {
    socketPromise.then((s) => s?.disconnect()).catch(() => {});
    socketPromise = null;
  }
}
