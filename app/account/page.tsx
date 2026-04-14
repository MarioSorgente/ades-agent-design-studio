"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuthStore } from "@/lib/auth/store";
import { signOutUser } from "@/lib/firebase/auth";
import { getUserProfile, submitAccountFeedback, updateUserProfile, type UserProfileRecord } from "@/lib/firebase/firestore";

type ProfileForm = {
  fullName: string;
  company: string;
  role: string;
  useCase: string;
  websiteOrLinkedIn: string;
};

const EMPTY_PROFILE: ProfileForm = {
  fullName: "",
  company: "",
  role: "",
  useCase: "",
  websiteOrLinkedIn: "",
};

function formatTrialDate(isoString: string | null) {
  if (!isoString) return null;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(isoString));
}

export default function AccountPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [profile, setProfile] = useState<ProfileForm>(EMPTY_PROFILE);
  const [profileMeta, setProfileMeta] = useState<UserProfileRecord | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);

  const [feedback, setFeedback] = useState("");
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      if (!user?.uid) {
        setIsLoadingProfile(false);
        return;
      }

      setIsLoadingProfile(true);
      try {
        const existing = await getUserProfile(user.uid);
        if (!mounted) return;

        setProfileMeta(existing);
        setProfile({
          fullName: existing?.fullName || user.displayName || "",
          company: existing?.company || "",
          role: existing?.role || "",
          useCase: existing?.useCase || "",
          websiteOrLinkedIn: existing?.websiteOrLinkedIn || "",
        });
      } catch {
        if (!mounted) return;
        setProfileStatus("Unable to load profile right now.");
      } finally {
        if (mounted) setIsLoadingProfile(false);
      }
    }

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, [user?.displayName, user?.uid]);

  const firstName = useMemo(() => user?.displayName?.split(" ")[0] || "Account", [user?.displayName]);
  const initials = useMemo(() => firstName.slice(0, 1).toUpperCase(), [firstName]);
  const planLabel = (profileMeta?.plan || "free").toUpperCase();

  async function handleSaveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user?.uid || isSavingProfile) return;

    setIsSavingProfile(true);
    setProfileStatus(null);
    try {
      await updateUserProfile(user.uid, profile);
      const refreshed = await getUserProfile(user.uid);
      setProfileMeta(refreshed);
      setProfileStatus("Details saved.");
    } catch (error) {
      setProfileStatus(error instanceof Error ? error.message : "Could not save profile details.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleSendFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user?.uid || !user.email || isSendingFeedback) return;

    setIsSendingFeedback(true);
    setFeedbackStatus(null);
    try {
      await submitAccountFeedback({ uid: user.uid, email: user.email, message: feedback });
      setFeedback("");
      setFeedbackStatus({ type: "success", text: "Thanks — feedback received." });
    } catch (error) {
      setFeedbackStatus({ type: "error", text: error instanceof Error ? error.message : "Could not send feedback." });
    } finally {
      setIsSendingFeedback(false);
    }
  }

  function handleBack() {
    const hasSameOriginReferrer =
      typeof document !== "undefined" &&
      typeof window !== "undefined" &&
      Boolean(document.referrer) &&
      URL.canParse(document.referrer) &&
      new URL(document.referrer).origin === window.location.origin;
    if (hasSameOriginReferrer) {
      router.back();
      return;
    }

    router.push("/dashboard");
  }

  return (
    <ProtectedRoute>
      <main className="mx-auto min-h-screen w-full max-w-5xl p-4 md:p-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white/90 p-5 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.65)] backdrop-blur md:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_14%,rgba(99,102,241,0.16),transparent_42%),radial-gradient(circle_at_90%_15%,rgba(147,51,234,0.14),transparent_35%)]" />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">Account</h1>
              <p className="mt-2 text-sm text-slate-600">Manage your profile, plan, and feedback.</p>
            </div>
            <button type="button" onClick={handleBack} className="ades-ghost-btn px-4 py-2 text-sm">
              ← Back
            </button>
          </div>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-2">
          <article className="ades-panel">
            <h2 className="text-base font-semibold text-slate-900">Signed-in identity</h2>
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white">{initials || "A"}</span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{profile.fullName || user?.displayName || "Unnamed user"}</p>
                <p className="text-xs text-slate-600">{user?.email || "No email"}</p>
              </div>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                <dt className="text-slate-500">Account status</dt>
                <dd className="font-medium text-slate-900 capitalize">{profileMeta?.status || "active"}</dd>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                <dt className="text-slate-500">Email</dt>
                <dd className="font-medium text-slate-900">{user?.email || "—"}</dd>
              </div>
            </dl>
          </article>

          <article className="ades-panel">
            <h2 className="text-base font-semibold text-slate-900">Plan & access</h2>
            <div className="mt-4 rounded-2xl border border-indigo-200/90 bg-indigo-50/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">Current plan</p>
              <p className="mt-1 text-xl font-semibold text-indigo-900">{planLabel}</p>
              <p className="mt-2 text-sm text-indigo-900/80">{profileMeta?.trialEndsAt ? `Trial ends on ${formatTrialDate(profileMeta.trialEndsAt)}.` : "Usage is available in your dashboard projects."}</p>
            </div>
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
              Usage summary and billing controls can be connected here when plan management is enabled.
            </div>
            <button type="button" className="ades-ghost-btn mt-3 w-full text-sm">
              Manage plan
            </button>
          </article>
        </section>

        <section className="mt-4 ades-panel">
          <h2 className="text-base font-semibold text-slate-900">Profile details</h2>
          <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={(event) => void handleSaveDetails(event)}>
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Full name</span>
              <input className="ades-input" value={profile.fullName} onChange={(event) => setProfile((prev) => ({ ...prev, fullName: event.target.value }))} maxLength={120} />
            </label>
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Company</span>
              <input className="ades-input" value={profile.company} onChange={(event) => setProfile((prev) => ({ ...prev, company: event.target.value }))} maxLength={120} />
            </label>
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Role</span>
              <input className="ades-input" value={profile.role} onChange={(event) => setProfile((prev) => ({ ...prev, role: event.target.value }))} maxLength={120} />
            </label>
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Website or LinkedIn</span>
              <input className="ades-input" value={profile.websiteOrLinkedIn} onChange={(event) => setProfile((prev) => ({ ...prev, websiteOrLinkedIn: event.target.value }))} maxLength={240} placeholder="https://" />
            </label>
            <label className="text-sm text-slate-700 md:col-span-2">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Use case / what are you building</span>
              <textarea className="ades-input min-h-28" value={profile.useCase} onChange={(event) => setProfile((prev) => ({ ...prev, useCase: event.target.value }))} maxLength={500} />
            </label>
            <div className="md:col-span-2 flex items-center gap-3">
              <button type="submit" disabled={isSavingProfile || isLoadingProfile} className="ades-primary-btn px-4 py-2.5 text-sm disabled:opacity-50">
                {isSavingProfile ? "Saving..." : "Save details"}
              </button>
              {profileStatus ? <p className="text-sm text-slate-600">{profileStatus}</p> : null}
            </div>
          </form>
        </section>

        <section className="mt-4 ades-panel">
          <h2 className="text-base font-semibold text-slate-900">Feedback</h2>
          <form className="mt-3" onSubmit={(event) => void handleSendFeedback(event)}>
            <textarea
              className="ades-input min-h-32"
              placeholder="Tell us what is confusing, missing, or useful…"
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              maxLength={4000}
            />
            <div className="mt-3 flex items-center gap-3">
              <button type="submit" disabled={isSendingFeedback || !feedback.trim()} className="ades-primary-btn px-4 py-2.5 text-sm disabled:opacity-50">
                {isSendingFeedback ? "Sending..." : "Send feedback"}
              </button>
              {feedbackStatus ? <p className={`text-sm ${feedbackStatus.type === "success" ? "text-emerald-700" : "text-rose-700"}`}>{feedbackStatus.text}</p> : null}
            </div>
          </form>
        </section>

        <section className="mt-4 ades-panel">
          <h2 className="text-base font-semibold text-slate-900">Security & session</h2>
          <p className="mt-2 text-sm text-slate-600">Signed in as {user?.email || "—"}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isSigningOut}
              onClick={async () => {
                setIsSigningOut(true);
                await signOutUser();
                window.location.assign("/sign-in");
              }}
              className="ades-ghost-btn px-4 py-2.5 text-sm"
            >
              {isSigningOut ? "Signing out..." : "Sign out"}
            </button>
            <p className="text-xs text-slate-500">Password controls are available when password auth is enabled.</p>
          </div>
        </section>
      </main>
    </ProtectedRoute>
  );
}
