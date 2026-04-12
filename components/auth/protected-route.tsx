"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth/store";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthStore((state) => state.status);
  const isConfigured = useAuthStore((state) => state.isConfigured);

  useEffect(() => {
    if (!isConfigured || status === "loading") {
      return;
    }

    if (status === "unauthenticated") {
      const search = pathname ? `?redirect=${encodeURIComponent(pathname)}` : "";
      router.replace(`/sign-in${search}`);
    }
  }, [isConfigured, pathname, router, status]);

  if (!isConfigured) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        Firebase auth is not configured yet. Add NEXT_PUBLIC_FIREBASE_* variables to enable sign in.
      </div>
    );
  }

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="rounded-xl border border-ades-soft bg-white p-6 text-sm text-slate-600">
        Checking your session...
      </div>
    );
  }

  return <>{children}</>;
}
