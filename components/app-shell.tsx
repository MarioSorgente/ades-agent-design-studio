import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { AuthHeaderActions } from "@/components/auth/auth-header-actions";

type AppShellProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function AppShell({ children, title, subtitle, actions }: AppShellProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-5 py-6 md:px-8">
      <header className="mb-6 rounded-3xl border border-slate-200/80 bg-white/85 p-5 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.65)] backdrop-blur md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Image src="/logo-ades.svg" alt="ADES logo" width={150} height={44} className="h-9 w-auto" priority />
              <p className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 md:inline-flex">
                Agent Design Studio
              </p>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-2 max-w-3xl text-sm text-slate-600 md:text-base">{subtitle}</p> : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/" className="ades-ghost-btn">
              Home
            </Link>
            <Link href="/dashboard" className="ades-ghost-btn">
              Dashboard
            </Link>
            <AuthHeaderActions />
            {actions}
          </div>
        </div>
      </header>

      <section className="flex-1">{children}</section>
    </main>
  );
}
