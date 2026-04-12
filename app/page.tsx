export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-12 md:px-10">
      <header className="mb-14">
        <p className="mb-3 inline-flex items-center rounded-full border border-ades-soft bg-white px-3 py-1 text-xs font-medium text-slate-600">
          ADES • Agent Design Studio
        </p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
          Design better agents before writing code.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-slate-600 md:text-lg">
          ADES helps PMs and non-developers turn an idea into a visual agent design with required
          reflections, critique, evals, and business metrics.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <FeatureCard
          title="Visual board first"
          description="Miro-like canvas for goals, tasks, risks, and feedback loops."
        />
        <FeatureCard
          title="Reflection required"
          description="Each design includes self-checks, uncertainty handling, and assumptions."
        />
        <FeatureCard
          title="Critique included"
          description="Identify weak spots and missing logic before implementation starts."
        />
        <FeatureCard
          title="Business-aware evals"
          description="Track quality plus metrics like time saved, escalation rate, and trust."
        />
      </section>

      <section className="mt-10 rounded-2xl border border-ades-soft bg-white p-6">
        <h2 className="text-lg font-semibold">M0 status</h2>
        <p className="mt-2 text-slate-600">
          Base scaffold is ready. Next step: route shell + auth-ready structure.
        </p>
      </section>
    </main>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <article className="rounded-2xl border border-ades-soft bg-white p-5">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </article>
  );
}
