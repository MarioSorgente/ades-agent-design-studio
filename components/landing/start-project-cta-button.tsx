"use client";

import Link from "next/link";
import { useAuthStore } from "@/lib/auth/store";

export function StartProjectCtaButton() {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);

  const href = status === "authenticated" && user ? "/dashboard" : "/sign-in";

  return (
    <Link href={href} className="ades-primary-btn w-full justify-center px-6 py-3 text-base md:w-auto">
      Start a project
    </Link>
  );
}
