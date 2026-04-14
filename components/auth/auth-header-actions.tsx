"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOutUser } from "@/lib/firebase/auth";
import { useAuthStore } from "@/lib/auth/store";

export function AuthHeaderActions() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const firstName = user?.displayName?.split(" ")[0] || "Account";
  const initial = firstName.slice(0, 1).toUpperCase();

  if (status === "loading") {
    return <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">Loading…</span>;
  }

  if (status !== "authenticated" || !user) {
    return (
      <Link href="/sign-in" className="ades-primary-btn px-3 py-2 text-xs">
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href="/dashboard" className="ades-ghost-btn px-3 py-2 text-xs">
        Dashboard
      </Link>
      <Link href="/account" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700">
        {user.photoURL ? (
          <img src={user.photoURL} alt={user.displayName ?? "Signed in user"} className="h-6 w-6 rounded-full" />
        ) : (
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-[11px] text-white">{initial || "A"}</span>
        )}
        {firstName}
      </Link>
      <button
        type="button"
        onClick={async () => {
          await signOutUser();
          router.push("/sign-in");
        }}
        className="ades-ghost-btn px-3 py-2 text-xs"
      >
        Sign out
      </button>
    </div>
  );
}
