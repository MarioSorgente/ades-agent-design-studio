"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AuthHeaderActions } from "@/components/auth/auth-header-actions";

type AppShellProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbLabel?: string;
  compact?: boolean;
};

const primaryNav = [
  { href: "/", label: "Home", match: (pathname: string) => pathname === "/" },
  { href: "/dashboard", label: "Dashboard", match: (pathname: string) => pathname.startsWith("/dashboard") },
  ];

export function AppShell({ children, title, subtitle, actions, breadcrumbLabel, compact = false }: AppShellProps) {
  const pathname = usePathname();

  return (
    <main className={`mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-5 ${compact ? "py-3" : "py-6"} md:px-8`}>
      <header className={`${compact ? "mb-3 p-3 md:p-4" : "mb-6 p-5 md:p-6"} rounded-3xl border border-slate-200/80 bg-white/85 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.65)] backdrop-blur`}>
        <div className={`flex flex-col ${compact ? "gap-2 pb-2" : "gap-4 pb-4"} border-b border-slate-200/80 md:flex-row md:items-center md:justify-between`}>
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Go to ADES landing page">
              <Image src="/logo-ades.svg" alt="ADES logo" width={150} height={44} className={`${compact ? "h-7" : "h-9"} w-auto`} priority />
            </Link>
            <p className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 md:inline-flex">
              Agent Design Studio
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <AuthHeaderActions />
            {actions}
          </div>
        </div>

        <div className={`${compact ? "mt-2" : "mt-4"} flex flex-col gap-2 md:flex-row md:items-start md:justify-between`}>
          <div>
            <nav aria-label="Primary" className={`${compact ? "mb-1" : "mb-3"} flex flex-wrap items-center gap-2`}>
              {primaryNav.map((item) => {
                const isActive = item.match(pathname);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={isActive ? "ades-primary-btn px-3 py-2 text-xs" : "ades-ghost-btn px-3 py-2 text-xs"}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <h1 className={`${compact ? "text-xl md:text-2xl" : "text-2xl md:text-3xl"} font-semibold tracking-tight text-slate-900`}>{title}</h1>
            {subtitle ? <p className={`mt-1 max-w-3xl ${compact ? "text-xs md:text-sm" : "text-sm md:text-base"} text-slate-600`}>{subtitle}</p> : null}
            {breadcrumbLabel ? (
              <p className={`${compact ? "mt-1.5" : "mt-3"} text-xs font-medium uppercase tracking-wide text-slate-500`}>Workspace / {breadcrumbLabel}</p>
            ) : null}
          </div>
        </div>
      </header>

      <section className="flex-1">{children}</section>
    </main>
  );
}
