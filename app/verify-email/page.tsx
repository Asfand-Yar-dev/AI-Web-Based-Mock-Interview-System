'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Loader2, Mail, ShieldCheck, MailCheck } from 'lucide-react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';
import { isValidEmail } from '@/lib/utils';

type Step = 'email' | 'otp';

// Show enough of the address to reassure "yes, that's mine" without printing it
// in full — e.g. "jo•••@gmail.com".
function maskEmail(value: string): string {
  const [local, domain] = value.split('@');
  if (!local || !domain) return value;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'•'.repeat(Math.max(local.length - visible.length, 1))}@${domain}`;
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const emailFromQuery = searchParams.get('email') || '';

  const [step, setStep] = useState<Step>(emailFromQuery ? 'otp' : 'email');
  const [email, setEmail] = useState(emailFromQuery);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Step 1 (only if no email was passed) — capture the email to verify.
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setStep('otp');
  };

  // Step 2 — verify the OTP.
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (otp.trim().length !== 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setBusy(true);
    try {
      await authApi.verifyEmailOtp(email.trim(), otp.trim());
      toast.success('Email verified', {
        description: 'Your account is active — you can now sign in.',
      });
      router.push('/login');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setError(message);
      toast.error('Invalid code', { description: message });
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setError('');
    if (!isValidEmail(email)) {
      setError('Enter a valid email first.');
      return;
    }
    setBusy(true);
    try {
      await authApi.resendEmailOtp(email.trim());
      toast.success('Code sent', { description: 'A new verification code is on its way.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      toast.error("Couldn't resend code", { description: message });
    } finally {
      setBusy(false);
    }
  };

  const meta =
    step === 'email'
      ? {
          eyebrow: 'Verify your email',
          title: 'Confirm your email',
          subtitle: "Enter the email you signed up with and we'll send a verification code.",
          icon: <Mail className="h-5 w-5 text-accent" />,
        }
      : {
          eyebrow: 'Verify your email',
          title: 'Enter your code',
          subtitle: `We sent a 6-digit code to ${maskEmail(email)}. It expires in 10 minutes.`,
          icon: <ShieldCheck className="h-5 w-5 text-accent" />,
        };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Decorative side panel */}
      <aside className="absolute inset-y-0 left-0 hidden w-[42%] lg:block">
        <div className="relative h-full w-full bg-sidebar">
          <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />
          <div className="pointer-events-none absolute bottom-12 left-12 h-56 w-56 rounded-full bg-chart-2/15 blur-3xl" />
          <div className="pointer-events-none absolute right-12 top-1/3 h-40 w-40 rotate-12 rounded-3xl border border-accent/30" />

          <div className="relative flex h-full flex-col justify-between p-12">
            <Link href="/" className="flex items-center gap-1.5">
              <Image
                src="/Logo_with_no_background.png"
                alt="Intervexa"
                width={64}
                height={64}
                className="object-contain"
              />
              <span className="font-display text-[22px] font-bold leading-none text-sidebar-foreground">Intervexa</span>
            </Link>

            <div className="space-y-6 max-w-md">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                <MailCheck className="h-3.5 w-3.5" />
                One quick step
              </div>
              <h2 className="text-4xl font-semibold leading-tight text-sidebar-foreground">
                Let's make sure this email is really yours.
              </h2>
              <p className="text-sidebar-foreground/70 leading-relaxed">
                We emailed you a one-time code. Enter it here to activate your account — this keeps
                Intervexa free of fake sign-ups.
              </p>

              <ul className="space-y-3 pt-2">
                {[
                  'A 6-digit code, valid for 10 minutes',
                  "Didn't get it? Resend in one click",
                  'Your account activates the moment you verify',
                ].map((line) => (
                  <li key={line} className="flex gap-3 text-sm text-sidebar-foreground/80">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-sidebar-foreground/40">
              Check your spam folder if the code doesn't arrive within a minute.
            </p>
          </div>
        </div>
      </aside>

      {/* Form side */}
      <main className="relative ml-0 flex min-h-screen items-center justify-center px-6 py-12 lg:ml-[42%] lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Link href="/" className="mb-10 flex items-center gap-1.5 lg:hidden">
            <Image
              src="/Logo_with_no_background.png"
              alt="Intervexa"
              width={64}
              height={64}
              className="object-contain"
            />
            <span className="font-display text-[22px] font-bold leading-none text-foreground">Intervexa</span>
          </Link>

          <div className="mb-8 flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary/40">
              {meta.icon}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-accent">{meta.eyebrow}</p>
              <h1 className="text-2xl font-semibold text-foreground">{meta.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{meta.subtitle}</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 'email' && (
              <motion.form
                key="email"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleEmailSubmit}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      placeholder="you@example.com"
                      autoComplete="email"
                      autoFocus
                      className="pl-10 bg-secondary/40 border-border/60"
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}

                <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  Continue<ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.form>
            )}

            {step === 'otp' && (
              <motion.form
                key="otp"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleVerify}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification code</Label>
                  <InputOTP
                    id="otp"
                    maxLength={6}
                    pattern={REGEXP_ONLY_DIGITS}
                    value={otp}
                    onChange={(value) => { setOtp(value); setError(''); }}
                    autoFocus
                    containerClassName="justify-center gap-2.5"
                  >
                    <InputOTPGroup className="gap-2.5">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="h-12 w-12 rounded-xl border border-border/60 bg-secondary/40 text-lg font-semibold first:rounded-xl last:rounded-xl"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}

                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {busy ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</>
                  ) : (
                    <>Verify email<ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => { setStep('email'); setOtp(''); setError(''); }}
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />Change email
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={busy}
                    className="text-accent hover:underline disabled:opacity-50"
                  >
                    Resend code
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already verified?{' '}
            <Link href="/login" className="font-medium text-accent hover:underline">
              Back to sign in
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Wrong email?{' '}
            <Link href="/signup" className="font-medium text-accent hover:underline">
              Back to sign up
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <Loader2 className="mx-auto h-12 w-12 text-accent animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
