/**
 * useBookingRealtime — subscribe to server-pushed booking lifecycle changes.
 *
 * Calls `onChange` whenever the backend emits `booking:changed` for one of the
 * current user's bookings (new request, accept/reject, payment, meeting,
 * feedback, results…). Pages use this to re-fetch their booking list so the UI
 * stays live without a manual refresh.
 *
 * The callback is held in a ref so passing a fresh function each render does
 * not re-subscribe; the socket listener is attached once per mount.
 */

"use client";

import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import { getRealtimeSocket } from "@/lib/realtimeSocket";

export function useBookingRealtime(onChange: () => void): void {
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    let socket: Socket | null = null;
    let active = true;
    const handler = () => cbRef.current();

    getRealtimeSocket().then((s) => {
      if (!s || !active) return;
      socket = s;
      s.on("booking:changed", handler);
    });

    return () => {
      active = false;
      if (socket) socket.off("booking:changed", handler);
    };
  }, []);
}
