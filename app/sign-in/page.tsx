"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { signInWithGoogle } from "@/lib/firebase/auth";
import { getMissingFirebaseEnvKeys } from "@/lib/firebase/config";
import { useAuthStore } from "@/lib/auth/store";

function getSafeRedirectTarget(value: string | null): string {
  if (!value || !value.startsWith("/")) {
    return "/dashboard";
  }

  if (value.startsWith("//") || value.includes("http://") || value.includes("https://")) {
    return "/dashboard";
  }

  return value;
}

export default function SignInPage() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const isConfigured = useAuthStore((state) => state.isConfigured);
  const [redirectTarget, setRedirectTarget] = useState("/dashboard");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const missingKeys = useMemo(() => getMissingFirebaseEnvKeys(), []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRedirectTarget(getSafeRedirectTarget(params.get("redirect")));
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

        {!isConfigured ? (
          <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            Firebase auth is not configured in this deployment.
            {missingKeys.length ? (
              <span className="mt-1 block text-xs text-amber-800">Missing keys: {missingKeys.join(", ")}</span>
            ) : (
              <span className="mt-1 block text-xs text-amber-800">If you just set env vars in Vercel, redeploy to apply them.</span>
            )}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{errorMessage}</div>
        ) : null}

        <button
          type="button"
          disabled={!isConfigured || isSubmitting || status === "loading"}
          onClick={async () => {
            setErrorMessage(null);
            setIsSubmitting(true);
            try {
              await signInWithGoogle();
              router.replace(redirectTarget);
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
