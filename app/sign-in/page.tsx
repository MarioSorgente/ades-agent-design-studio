"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { signInWithGoogle } from "@/lib/firebase/auth";
import { hasFirebaseEnv } from "@/lib/firebase/config";
import { useAuthStore } from "@/lib/auth/store";

export default function SignInPage() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const isConfigured = useAuthStore((state) => state.isConfigured);
  const [redirectTarget, setRedirectTarget] = useState("/dashboard");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");

    if (redirect) {
      setRedirectTarget(redirect);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(redirectTarget);
    }
  }, [redirectTarget, router, status]);

  return (
    <AppShell
      title="Sign in"
      subtitle="Start a focused ADES session and create agent designs your team can critique, evaluate, and ship with confidence."
    >
      <section className="mx-auto mt-6 w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_28px_70px_-55px_rgba(15,23,42,0.75)]">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome back</h2>
        <p className="mt-2 text-sm text-slate-600">Use Google sign-in to continue to your private dashboard and studio boards.</p>

        {!isConfigured || !hasFirebaseEnv() ? (
          <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            Firebase auth is not configured yet. Add environment variables before signing in.
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{errorMessage}</div>
        ) : null}

        <button
          type="button"
          disabled={!isConfigured || isSubmitting}
          onClick={async () => {
            setErrorMessage(null);
            setIsSubmitting(true);
            try {
              await signInWithGoogle();
              router.push(redirectTarget);
            } catch (error) {
              const message = error instanceof Error ? error.message : "Unable to sign in with Google.";
              setErrorMessage(message);
            } finally {
              setIsSubmitting(false);
            }
          }}
          className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Signing in..." : "Continue with Google"}
        </button>
      </section>
    </AppShell>
  );
}
