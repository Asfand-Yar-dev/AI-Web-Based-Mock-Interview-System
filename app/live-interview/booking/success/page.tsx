"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Video, ArrowRight, Loader2 } from "lucide-react";
import { API_BASE_URL, STORAGE_KEYS } from "@/lib/api-config";

import { Suspense } from "react";

function BookingSuccessContent() {
  const params    = useSearchParams();
  const bookingId = params.get("bookingId");
  const [booking, setBooking]   = useState<any>(null);
  const [loading, setLoading]   = useState(!!bookingId);

  // Fetch the booking to decide whether to link to "Join Room" or "View Results"
  useEffect(() => {
    if (!bookingId) return;
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    fetch(`${API_BASE_URL}/api/bookings/${bookingId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setBooking(d?.data?.booking ?? null))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [bookingId]);

  const roomId   = booking?.meetingRoomId;
  const isReady  = booking?.status === "confirmed" || booking?.status === "in_progress";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/50 bg-card p-8 text-center shadow-xl">
        {/* Icon */}
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success/15 ring-1 ring-success/30">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>

        <h1 className="text-2xl font-bold text-card-foreground">Payment received!</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Your booking is confirmed. We&rsquo;ve emailed a calendar invite to you and your
          interviewer. Join the meeting room from that link or open it below.
        </p>

        {loading && (
          <div className="mt-6 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && bookingId && (
          <div className="mt-6 flex flex-col gap-3">
            {isReady && roomId && (
              <Link
                href={`/live-interview/room/${roomId}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
              >
                <Video className="h-4 w-4" />
                Join Meeting Room
              </Link>
            )}
            <Link
              href={`/live-interview/results/${bookingId}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/50 bg-transparent px-6 py-3 text-sm font-medium text-card-foreground transition-colors hover:bg-secondary"
            >
              <ArrowRight className="h-4 w-4" />
              View Booking Details
            </Link>
          </div>
        )}

        {!loading && !bookingId && (
          <div className="mt-6">
            <Link
              href="/live-interview/my-bookings"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
            >
              My Bookings
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    }>
      <BookingSuccessContent />
    </Suspense>
  );
}
