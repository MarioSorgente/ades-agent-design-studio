import Link from "next/link";

const comparisonRows = [
  { label: "Detect oversized prompts", noTool: "No", manual: "Partial", free: "Yes", pro: "Yes" },
  { label: "Detect repeated context", noTool: "No", manual: "Manual", free: "Yes", pro: "Yes" },
  { label: "Compress input context", noTool: "No", manual: "Manual", free: "Suggested", pro: "Advanced" },
  { label: "Improve prompt structure", noTool: "No", manual: "Manual", free: "Yes", pro: "Advanced" },
  { label: "Claude support", noTool: "No", manual: "Yes", free: "Yes", pro: "Yes" },
  { label: "ChatGPT support", noTool: "No", manual: "Yes", free: "Yes", pro: "Yes" },
  { label: "Reusable memory suggestion", noTool: "No", manual: "No", free: "Basic", pro: "Expanded" },
  { label: "AI-powered optimization", noTool: "No", manual: "No", free: "2/day", pro: "Higher limits" },
  { label: "GitHub context packs", noTool: "No", manual: "No", free: "No", pro: "Coming soon" },
  { label: "Cursor workflow support", noTool: "No", manual: "No", free: "No", pro: "Coming soon" },
  { label: "Effective AI bandwidth", noTool: "Low", manual: "Medium", free: "High", pro: "Highest" }
];

const steps = [
  "Scan your prompt locally from the extension icon.",
  "See token waste warnings: repeated context, huge pasted history, and weak structure.",
  "Approve optimization to reduce repetition while preserving your intent.",
  "Review before/after estimates, then replace only if you approve.",
  "Save reusable context snippets when THOR suggests memory candidates."
];

export default function ThorPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-5 py-6 md:px-8">
      <section className="ades-panel relative overflow-hidden rounded-[2rem] border-slate-200/90 px-6 py-12 md:px-12 md:py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.12),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(147,51,234,0.12),transparent_36%),radial-gradient(circle_at_55%_88%,rgba(59,130,246,0.08),transparent_34%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:90px_90px]" />

        <div className="relative z-10 mx-auto max-w-5xl">
          <p className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
            ADES Labs · Companion tool
          </p>

          <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
            Your AI is not expensive.
            <span className="ml-2 text-slate-500 italic">Your context is messy.</span>
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-600 md:text-lg">
            THOR helps Claude and ChatGPT users get more output from the same AI plan by reducing token waste without compromising quality.
          </p>

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">More output · Fewer limits · Lower cost</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="https://chromewebstore.google.com" target="_blank" rel="noreferrer" className="ades-primary-btn px-6 py-3" data-thor-cta="install-claude">
              Install THOR for Claude
            </a>
            <a
              href="mailto:ms.sorgente@gmail.com?subject=THOR%20early%20access&body=Hi%2C%20I%27d%20like%20to%20join%20THOR%20early%20access."
              className="ades-ghost-btn px-6 py-3"
              data-thor-cta="early-access"
            >
              Join early access
            </a>
            <Link href="/" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
              ← Back to ADES
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200/80 bg-white/85 p-6 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.65)] backdrop-blur md:p-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">Compare your options</h2>
          <p className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 md:block">Capability matrix</p>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                <th className="px-3 py-3">Capability</th>
                <th className="px-3 py-3">No tool</th>
                <th className="px-3 py-3">Manual cleanup</th>
                <th className="px-3 py-3">THOR Free</th>
                <th className="px-3 py-3">THOR Pro / Coming soon</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.label} className="border-b border-slate-100">
                  <td className="px-3 py-3 font-medium text-slate-900">{row.label}</td>
                  <td className="px-3 py-3 text-slate-500">{row.noTool}</td>
                  <td className="px-3 py-3 text-slate-600">{row.manual}</td>
                  <td className="px-3 py-3 text-emerald-700">{row.free}</td>
                  <td className="px-3 py-3 text-indigo-700">{row.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-[1.45fr_1fr]">
        <article className="rounded-3xl border border-slate-200/80 bg-white/85 p-6 shadow-[0_10px_30px_-26px_rgba(15,23,42,0.8)] md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">How THOR works</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">From messy prompt to clean signal.</h2>
          <ol className="mt-5 space-y-3">
            {steps.map((step, index) => (
              <li key={step} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-[11px] font-semibold text-white">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </article>

        <div className="space-y-4">
          <article className="rounded-3xl border border-indigo-900/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 p-6 text-white shadow-[0_18px_35px_-25px_rgba(15,23,42,0.95)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-200">Free plan · MVP</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight">Start saving tokens today.</h3>
            <ul className="mt-4 space-y-2 text-sm text-indigo-100">
              <li>• Chrome extension</li>
              <li>• Claude + ChatGPT support</li>
              <li>• Local token-waste checks (no API required)</li>
              <li>• 2 AI optimizations/day using a nano model</li>
              <li>• Basic reusable memory suggestions</li>
            </ul>
            <a href="https://chromewebstore.google.com" target="_blank" rel="noreferrer" className="mt-6 inline-flex w-full justify-center rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-400" data-thor-cta="install-free">
              Install free
            </a>
          </article>

          <article className="rounded-3xl border border-slate-200/80 bg-white/85 p-6 shadow-[0_10px_30px_-26px_rgba(15,23,42,0.8)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Coming soon</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">THOR Pro</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>• GitHub context packs for vibe-coding repos</li>
              <li>• Cursor workflow support</li>
              <li>• Pro usage dashboard and higher limits</li>
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}
