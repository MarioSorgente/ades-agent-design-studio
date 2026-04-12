import Link from "next/link";
import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function AppShell({ children, title, subtitle, actions }: AppShellProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 md:px-10">
      <header className="mb-8 flex flex-col gap-4 rounded-2xl border border-ades-soft bg-white p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">ADES</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-slate-600 md:text-base">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="rounded-lg border border-ades-soft px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Dashboard
          </Link>
          <Link
            href="/sign-in"
            className="rounded-lg border border-ades-soft px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Sign in
          </Link>
          {actions}
        </div>
      </header>

      <section className="flex-1">{children}</section>
    </main>
  );
}
