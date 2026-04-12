"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOutUser } from "@/lib/firebase/auth";
import { useAuthStore } from "@/lib/auth/store";

export function AuthHeaderActions() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);

  if (status !== "authenticated" || !user) {
    return (
      <Link href="/sign-in" className="ades-primary-btn">
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 md:flex">
        {user.photoURL ? (
          <img src={user.photoURL} alt={user.displayName ?? user.email ?? "Signed in user"} className="h-6 w-6 rounded-full" />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-600">
            {(user.displayName ?? user.email ?? "U").slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="max-w-56">
          <p className="truncate text-xs font-semibold text-slate-700">{user.displayName ?? "Signed in"}</p>
          <p className="truncate text-[11px] text-slate-500">{user.email}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={async () => {
          await signOutUser();
          router.push("/sign-in");
        }}
        className="ades-ghost-btn"
      >
        Sign out
      </button>
    </div>
  );
}
