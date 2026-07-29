"use client";

/**
 * Premium Live Interview — Meeting Room page
 * Full-screen room that resolves the bookingId from meetingRoomId,
 * then renders the redesigned LiveInterviewRoom component.
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { LiveInterviewRoom } from "@/components/live-interview/LiveInterviewRoom";
import { API_BASE_URL, STORAGE_KEYS } from "@/lib/api-config";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

export default function LiveRoomPage() {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const roomId = params?.roomId as string;
  const { user } = useAuth();

  const [bookingId, setBookingId]   = useState<string | null>(null);
  const [isApplicant, setIsApplicant] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    async function resolveBooking() {
      const token = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      try {
        for (const qs of ["", "?as=interviewer"]) {
          const res  = await fetch(`${API_BASE_URL}/api/bookings/mine${qs}`, { headers });
          const data = await res.json();
          if (!res.ok) continue;
          const match = (data.data as any[]).find((b) => b.meetingRoomId === roomId);
          // The applicant is matched by the plain /mine call; ?as=interviewer
          // returns the bookings where the viewer is the interviewer.
          if (match) { setBookingId(match._id); setIsApplicant(qs === ""); return; }
        }
        throw new Error("You are not a participant of this room.");
      } catch (err: any) {
        setError(err?.message || "Failed to load room");
      }
    }
    if (roomId) resolveBooking();
  }, [roomId]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black p-6 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-white">{error}</p>
        <Button variant="outline" onClick={() => router.push("/live-interview/my-bookings")} className="bg-transparent text-white border-white/20">
          Back to My Bookings
        </Button>
      </div>
    );
  }

  if (!bookingId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-sm text-white/60">Setting up your meeting room…</p>
      </div>
    );
  }

  return (
    <LiveInterviewRoom
      bookingId={bookingId}
      meetingRoomId={roomId}
      isApplicant={isApplicant}
      localName={user?.name || "You"}
      remoteName={isApplicant ? "Interviewer" : "Applicant"}
      onEnded={() => router.push(`/live-interview/results/${bookingId}`)}
    />
  );
}
