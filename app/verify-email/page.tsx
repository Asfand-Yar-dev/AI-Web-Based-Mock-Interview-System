'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import { emailVerificationApi } from '@/lib/api';

type State = 'loading' | 'success' | 'error' | 'missing';

import { Suspense } from 'react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<State>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setState('missing');
      return;
    }

    emailVerificationApi
      .verify(token)
      .then((res) => {
        setMessage(res.message || 'Your email has been verified successfully.');
        setState('success');
      })
      .catch((err: Error) => {
        setMessage(err.message || 'Verification failed. The link may have expired.');
        setState('error');
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-lg p-8 text-center">
        {state === 'loading' && (
          <>
            <Loader2 className="mx-auto h-12 w-12 text-accent animate-spin mb-4" />
            <h1 className="text-xl font-semibold text-foreground">Verifying your email…</h1>
            <p className="mt-2 text-sm text-muted-foreground">This will only take a moment.</p>
          </>
        )}

        {state === 'success' && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-success mb-4" />
            <h1 className="text-xl font-semibold text-foreground">Email Verified!</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-6 w-full py-2.5 px-4 rounded-lg bg-accent text-accent-foreground font-medium hover:opacity-90 transition-opacity"
            >
              Go to Dashboard
            </button>
          </>
        )}

        {state === 'error' && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h1 className="text-xl font-semibold text-foreground">Verification Failed</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-2.5 px-4 rounded-lg bg-accent text-accent-foreground font-medium hover:opacity-90 transition-opacity"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => router.push('/login')}
                className="w-full py-2.5 px-4 rounded-lg border border-border text-foreground font-medium hover:bg-secondary transition-colors"
              >
                Back to Login
              </button>
            </div>
          </>
        )}

        {state === 'missing' && (
          <>
            <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h1 className="text-xl font-semibold text-foreground">Invalid Link</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              No verification token found. Please use the link from your email.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-6 w-full py-2.5 px-4 rounded-lg bg-accent text-accent-foreground font-medium hover:opacity-90 transition-opacity"
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Loader2 className="mx-auto h-12 w-12 text-accent animate-spin mb-4" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
