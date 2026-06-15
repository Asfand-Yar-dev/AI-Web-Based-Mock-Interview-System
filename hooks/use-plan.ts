'use client';

/**
 * usePlan — convenience hook for plan-aware components.
 *
 * Usage:
 *   const { isPro, isFree, sessionLimit } = usePlan();
 */

import { useAuth } from '@/contexts/auth-context';

const FREE_MONTHLY_SESSIONS = 3; // keep in sync with backend PLAN_LIMITS

export interface PlanInfo {
  plan: 'free' | 'pro';
  isPro: boolean;
  isFree: boolean;
  /** Monthly session cap (null = unlimited for Pro) */
  sessionLimit: number | null;
  upgradePlan: (plan?: 'pro' | 'free') => Promise<void>;
}

export function usePlan(): PlanInfo {
  const { user, isPro, upgradePlan } = useAuth();

  const plan = (user?.plan ?? 'free') as 'free' | 'pro';

  return {
    plan,
    isPro,
    isFree: !isPro,
    sessionLimit: isPro ? null : FREE_MONTHLY_SESSIONS,
    upgradePlan,
  };
}
