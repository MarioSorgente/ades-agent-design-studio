"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOutUser } from "@/lib/firebase/auth";
import { useAuthStore } from "@/lib/auth/store";

export function AuthHeaderActions() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);

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
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1">
        {user.photoURL ? <img src={user.photoURL} alt={user.displayName ?? "Signed in user"} className="h-6 w-6 rounded-full" /> : null}
        <span className="text-xs font-semibold text-slate-700">{user.displayName?.split(" ")[0] || "Account"}</span>
      </div>
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
