"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle } from "@/lib/firebase/auth";
import { useAuthStore } from "@/lib/auth/store";
import { getMissingFirebaseEnvKeys } from "@/lib/firebase/config";

function getSafeRedirectTarget(value: string | null): string {
  if (!value || !value.startsWith("/")) {
    return "/dashboard";
  }

  if (value.startsWith("//") || value.includes("http://") || value.includes("https://")) {
    return "/dashboard";
  }

  return value;
}

function getFriendlyAuthError(message: string): { title: string; detail?: string } {
  const lowered = message.toLowerCase();

  if (lowered.includes("auth/unauthorized-domain")) {
    return {
      title: "This domain is not authorized for Google sign-in. Add it in Firebase Authentication settings.",
      detail: message
    };
  }

  if (lowered.includes("auth/popup-closed-by-user")) {
    return {
      title: "Sign-in was canceled before it completed.",
      detail: message
    };
  }

  if (lowered.includes("auth/popup-blocked")) {
    return {
      title: "Your browser blocked the Google sign-in pop-up. Allow pop-ups and try again.",
      detail: message
    };
  }

  if (lowered.includes("auth/network-request-failed")) {
    return {
      title: "Network issue while connecting to Google. Check your connection and retry.",
      detail: message
    };
  }

  return {
    title: "Unable to sign in with Google right now. Please try again.",
    detail: message
  };
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#4285F4" d="M21.82 12.23c0-.72-.06-1.25-.2-1.8H12v3.58h5.65c-.11.89-.72 2.24-2.08 3.14l-.02.12 3.03 2.34.21.02c1.88-1.73 3.03-4.28 3.03-7.4Z" />
      <path fill="#34A853" d="M12 22c2.76 0 5.08-.91 6.77-2.47l-3.22-2.49c-.86.6-2.02 1.02-3.55 1.02-2.7 0-4.99-1.77-5.81-4.22l-.11.01-3.15 2.43-.04.1A10.24 10.24 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.19 13.84A6.17 6.17 0 0 1 5.85 12c0-.64.12-1.26.33-1.84l-.01-.12-3.18-2.47-.1.05A10.03 10.03 0 0 0 2 12c0 1.62.39 3.16 1.09 4.38l3.1-2.54Z" />
      <path fill="#EB4335" d="M12 5.94c1.93 0 3.23.84 3.98 1.54l2.9-2.83C17.08 2.98 14.76 2 12 2 8 2 4.53 4.25 2.9 7.62l3.29 2.54c.83-2.45 3.12-4.22 5.81-4.22Z" />
    </svg>
  );
}

export default function SignInPage() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const isConfigured = useAuthStore((state) => state.isConfigured);
  const [redirectTarget, setRedirectTarget] = useState("/dashboard");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const missingKeys = useMemo(() => getMissingFirebaseEnvKeys(), []);
  const friendlyError = errorMessage ? getFriendlyAuthError(errorMessage) : null;

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
    <main className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-5 py-6 md:px-8">
      <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/55 px-4 py-12 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.65)] backdrop-blur md:px-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.14),transparent_40%),radial-gradient(circle_at_82%_26%,rgba(147,51,234,0.14),transparent_34%),radial-gradient(circle_at_54%_88%,rgba(59,130,246,0.1),transparent_34%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.09)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.09)_1px,transparent_1px)] bg-[size:84px_84px]" />

        <div className="relative w-full max-w-md rounded-[2rem] border border-slate-200/90 bg-white/95 p-7 shadow-[0_30px_70px_-55px_rgba(15,23,42,0.75)] md:p-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900">
              <span aria-hidden>←</span>
              Back home
            </Link>
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-700">
              Secure sign-in
            </span>
          </div>

          <div className="mt-6 flex flex-col items-start">
            <Image src="/logo-ades.svg" alt="ADES logo" width={148} height={44} className="h-9 w-auto" priority />
            <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900">Welcome back</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Sign in to continue designing agent systems.</p>
          </div>

          {!isConfigured ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/90 p-3 text-sm text-amber-950">
              Firebase auth is not configured in this deployment.
              {missingKeys.length ? (
                <span className="mt-1 block text-xs text-amber-800">Missing keys: {missingKeys.join(", ")}</span>
              ) : (
                <span className="mt-1 block text-xs text-amber-800">If you just set env vars in Vercel, redeploy to apply them.</span>
              )}
            </div>
          ) : null}

          {friendlyError ? (
            <div className="mt-4 rounded-2xl border border-rose-200/80 bg-rose-50/85 p-3 text-sm text-rose-900">
              <p className="font-medium">{friendlyError.title}</p>
              {friendlyError.detail ? <p className="mt-1 text-xs text-rose-700/80">{friendlyError.detail}</p> : null}
            </div>
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
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.9)] transition hover:border-indigo-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <GoogleMark />
            {isSubmitting ? "Signing in..." : "Continue with Google"}
          </button>

          <p className="mt-4 text-center text-xs font-medium text-slate-500">Private workspace · Agent designs · Evals</p>
        </div>
      </div>
    </main>
  );
}
