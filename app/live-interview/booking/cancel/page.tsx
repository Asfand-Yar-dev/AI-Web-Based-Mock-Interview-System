"use client";

import Link from "next/link";
import { XCircle, RotateCcw } from "lucide-react";

export default function BookingCancelPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/50 bg-card p-8 text-center shadow-xl">
        {/* Icon */}
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-warning/15 ring-1 ring-warning/30">
          <XCircle className="h-8 w-8 text-warning" />
        </div>

        <h1 className="text-2xl font-bold text-card-foreground">Payment cancelled</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Your booking is still pending. You can retry the payment any time before the
          slot expires — no changes have been made to your booking.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/live-interview/book"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Link>
          <Link
            href="/live-interview/my-bookings"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/50 bg-transparent px-6 py-3 text-sm font-medium text-card-foreground transition-colors hover:bg-secondary"
          >
            My Bookings
          </Link>
        </div>
      </div>
    </div>
  );
}
