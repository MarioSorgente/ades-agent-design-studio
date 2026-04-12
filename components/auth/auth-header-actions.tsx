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
      <p className="hidden max-w-56 truncate text-sm text-slate-600 md:block">{user.displayName ?? user.email}</p>
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
