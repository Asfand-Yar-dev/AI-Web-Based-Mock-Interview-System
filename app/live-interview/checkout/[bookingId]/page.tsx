"use client";

/**
 * Premium Live Interview — Checkout Page
 * Shows a booking summary and redirects to Jazzcash/Easypaisa payment URL.
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Clock,
  Briefcase,
  Tag,
  Globe,
  CreditCard,
  Loader2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Info,
  CheckCircle2,
} from "lucide-react";
import { liveInterviewApi, type LiveBooking, BOOKING_STATUS } from "@/lib/liveInterviewApi";
import { Button } from "@/components/ui/button";
import { PremiumLayout, PremiumBadge } from "@/components/live-interview/premium-layout";
import { BookingStatusBadge } from "@/components/live-interview/booking-status-badge";

function SummaryRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-medium text-card-foreground">{value}</span>
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams<{ bookingId: string }>();
  const bookingId = params?.bookingId as string;

  const [booking, setBooking] = useState<LiveBooking | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [busy, setBusy]       = useState(false);

  useEffect(() => {
    if (!bookingId || bookingId === "undefined") return;
    if (!/^[0-9a-fA-F]{24}$/.test(bookingId)) {
      setError("Invalid ID format");
      return;
    }
    liveInterviewApi
      .getBooking(bookingId)
      .then((res) => setBooking(res.data.booking))
      .catch((err) => setError(err?.message || "Could not load booking"));
  }, [bookingId]);

  async function pay() {
    setBusy(true);
    try {
      const res = await liveInterviewApi.createCheckout(bookingId);
      window.location.href = res.data.url;
    } catch (err: any) {
      setError(err?.message || "Checkout failed. Please try again.");
      setBusy(false);
    }
  }

  if (error && !booking) {
    return (
      <PremiumLayout backHref="/live-interview/my-bookings" backLabel="My Bookings">
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={() => router.push("/live-interview/my-bookings")} className="mt-2 bg-transparent">
            Back to My Bookings
          </Button>
        </div>
      </PremiumLayout>
    );
  }

  if (!booking) {
    return (
      <PremiumLayout backHref="/live-interview/my-bookings" backLabel="My Bookings">
        <div className="flex flex-col items-center gap-3 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">Loading booking details…</p>
        </div>
      </PremiumLayout>
    );
  }

  const when = new Date(booking.scheduledTime);

  return (
    <PremiumLayout backHref="/live-interview/book" backLabel="Change Details">
      {/* Acceptance banner */}
      {booking.status === BOOKING_STATUS.ACCEPTED && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4"
        >
          <CheckCircle2 className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-300 text-sm">Your interview booking has been accepted.</p>
            <p className="text-xs text-blue-400/80 mt-0.5">Please proceed with payment to confirm your session.</p>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="mb-8 space-y-2">
        <PremiumBadge />
        <h1 className="text-3xl font-bold text-foreground">Confirm & Pay</h1>
        <p className="text-muted-foreground">
          Review your booking, then proceed to secure payment. Calendar invites are sent immediately after confirmation.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-5"
      >
        {/* Booking summary card */}
        <div className="rounded-2xl border border-border/50 bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-card-foreground">Booking Summary</h2>
            <BookingStatusBadge status={booking.status} />
          </div>
          <div className="divide-y divide-border/30">
            <SummaryRow icon={Briefcase}   label="Role"       value={booking.role} />
            <SummaryRow icon={Globe}       label="Domain"     value={booking.domain} />
            <SummaryRow icon={Tag}         label="Skills"     value={booking.skills?.join(", ") || "—"} />
            <SummaryRow icon={CalendarDays} label="Date"      value={when.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} />
            <SummaryRow icon={Clock}       label="Time"       value={when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} />
            <SummaryRow icon={Clock}       label="Duration"   value={`${booking.durationMinutes} minutes`} />
          </div>
        </div>

        {/* Payment method card */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
          <h2 className="text-base font-semibold text-card-foreground">Payment Method</h2>
          <div className="flex items-center gap-4">
            {/* Jazzcash */}
            <div className="flex flex-1 items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20">
                <CreditCard className="h-4 w-4 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-card-foreground">Jazzcash</p>
                <p className="text-xs text-muted-foreground">Mobile wallet</p>
              </div>
            </div>
            {/* Easypaisa */}
            <div className="flex flex-1 items-center gap-3 rounded-xl border border-border/30 bg-secondary/30 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/20">
                <CreditCard className="h-4 w-4 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-card-foreground">Easypaisa</p>
                <p className="text-xs text-muted-foreground">Mobile wallet</p>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-secondary/20 p-3">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              You will be redirected to the payment provider to complete your transaction securely.
              Your booking slot is held for 15 minutes.
            </p>
          </div>
        </div>

        {/* Security note */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          Payments are processed securely. Your card details are never stored by Intervexa.
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </motion.div>
        )}

        {/* CTA */}
        <Button
          onClick={pay}
          disabled={busy || ![BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.PAYMENT_PENDING].includes(booking.status as any)}
          className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90 py-6 text-base font-semibold"
        >
          {busy ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Redirecting to Payment…
            </>
          ) : (
            <>
              Proceed to Payment
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </Button>

        {![BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.PAYMENT_PENDING].includes(booking.status as any) && (
          <p className="text-center text-sm text-muted-foreground">
            This booking is <strong>{booking.status.replace(/_/g, " ")}</strong>.
          </p>
        )}

        <button
          onClick={() => router.back()}
          className="block w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </motion.div>
    </PremiumLayout>
  );
}
