import Link from "next/link";

const pillars = [
  {
    title: "Canvas-first design studio",
    description: "Map goals, task logic, feedback loops, and handoffs in a visual workspace built for planning AI products."
  },
  {
    title: "Reflection + critique built in",
    description: "Treat reflection, assumptions, and risk review as first-class design artifacts, not afterthoughts."
  },
  {
    title: "Eval and business alignment",
    description: "Define quality checks and business metrics together, so implementation starts with measurable intent."
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-5 py-10 md:px-8">
      <section className="ades-panel relative overflow-hidden p-8 md:p-10">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-100/60 blur-2xl" />
        <div className="absolute -bottom-20 left-24 h-56 w-56 rounded-full bg-violet-100/70 blur-2xl" />

        <div className="relative grid gap-10 md:grid-cols-[1.15fr_0.85fr] md:items-center">
          <div>
            <p className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              ADES · Agent Design Studio
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 md:text-6xl">
              Design serious AI agents before writing runtime code.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
              ADES helps PMs and founders turn a rough idea into a premium visual board with tasks,
              reflections, critique paths, eval logic, and business outcomes.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/dashboard" className="ades-primary-btn">
                Open dashboard
              </Link>
              <Link href="/sign-in" className="ades-ghost-btn">
                Continue with Google
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-[#f3f5fa] p-4 shadow-inner">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
                <span>Studio preview</span>
                <span>Premium workspace shell</span>
              </div>
              <div className="grid grid-cols-[150px_1fr_180px] gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">Project panel</div>
                <div className="rounded-xl border border-slate-200 bg-[#f6f8fc] p-2">
                  <div className="grid h-32 place-items-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-500">
                    Board canvas
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">Inspector</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {pillars.map((pillar) => (
          <article key={pillar.title} className="ades-panel p-5">
            <h2 className="text-base font-semibold text-slate-900">{pillar.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{pillar.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
