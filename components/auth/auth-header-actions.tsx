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
      <Link
        href="/sign-in"
        className="rounded-lg border border-ades-soft px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <p className="hidden text-sm text-slate-600 md:block">{user.displayName ?? user.email}</p>
      <button
        type="button"
        onClick={async () => {
          await signOutUser();
          router.push("/sign-in");
        }}
        className="rounded-lg border border-ades-soft px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        Sign out
      </button>
    </div>
  );
}
