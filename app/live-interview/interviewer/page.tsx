"use client";

/**
 * Backwards-compat redirect: the interviewer hub now lives at the role-aligned
 * route /interviewer-dashboard (matches /dashboard, /admin-dashboard).
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyInterviewerHubRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/interviewer-dashboard"); }, [router]);
  return <div className="p-6">Redirecting…</div>;
}
