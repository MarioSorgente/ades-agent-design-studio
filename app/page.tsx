import Image from "next/image";
import Link from "next/link";

const floatingSignals = [
  { label: "Reflection loop", className: "left-[10%] top-[24%] animate-float-slow" },
  { label: "Eval coverage", className: "right-[12%] top-[20%] animate-float" },
  { label: "Business metric", className: "left-[16%] bottom-[16%] animate-float-delayed" },
  { label: "Human handoff", className: "right-[18%] bottom-[18%] animate-float-slow" }
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-5 py-6 md:px-8">
      <header className="mb-6 rounded-3xl border border-slate-200/80 bg-white/85 p-5 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.65)] backdrop-blur md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Image src="/logo-ades.svg" alt="ADES logo" width={150} height={44} className="h-9 w-auto" priority />
            <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 md:inline-flex">
              Agent Design Studio
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/sign-in" className="ades-ghost-btn px-3 py-2 text-xs md:text-sm">
              Log in
            </Link>
            <Link href="/sign-in" className="ades-ghost-btn px-3 py-2 text-xs md:text-sm">
              Sign in
            </Link>
            <Link href="/sign-in" className="ades-primary-btn px-3 py-2 text-xs md:text-sm">
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <section className="ades-panel relative overflow-hidden rounded-[2rem] border-slate-200/90 px-6 py-14 md:px-12 md:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.12),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(147,51,234,0.12),transparent_36%),radial-gradient(circle_at_55%_88%,rgba(59,130,246,0.08),transparent_34%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:90px_90px]" />

        {floatingSignals.map((chip) => (
          <div
            key={chip.label}
            className={`pointer-events-none absolute hidden rounded-full border border-indigo-200/70 bg-white/85 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm md:block ${chip.className}`}
          >
            {chip.label}
          </div>
        ))}

        <div className="relative mx-auto max-w-4xl text-center">
          <p className="mx-auto inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
            Visual planning for AI product teams
          </p>
          <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-6xl">
            Build agent designs with
            <span className="ml-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500 bg-clip-text text-transparent">
              structure, critique, and confidence
            </span>
            .
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
            ADES helps PMs and founders turn a fuzzy idea into an editable board with tasks, reflections,
            feedback loops, risks, evals, and business metrics—before runtime implementation.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/dashboard" className="ades-primary-btn px-6 py-3">
              Try ADES Studio
            </Link>
            <Link href="/sign-in" className="ades-ghost-btn px-6 py-3">
              Request a demo flow
            </Link>
          </div>

          <div className="mt-10 grid gap-3 md:grid-cols-3">
            <InteractiveCard title="Canvas-first workspace" description="Miro-like center canvas with premium side panels and inspector rhythm." />
            <InteractiveCard title="Reflection + critique" description="Keep uncertainty checks and critique loops first-class, not hidden in docs." />
            <InteractiveCard title="Eval + business metrics" description="Define quality and outcome targets early so execution can be measured." />
          </div>
        </div>
      </section>
    </main>
  );
}

function InteractiveCard({ title, description }: { title: string; description: string }) {
  return (
    <article className="group rounded-2xl border border-slate-200/80 bg-white/80 p-4 text-left shadow-[0_10px_30px_-26px_rgba(15,23,42,0.8)] transition hover:-translate-y-1 hover:border-indigo-200 hover:bg-white">
      <h2 className="text-sm font-semibold text-slate-900 transition group-hover:text-indigo-700">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
    </article>
  );
}
