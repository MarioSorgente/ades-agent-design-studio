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
    <main className="relative min-h-screen overflow-hidden bg-[#f3f3f2] px-4 py-8 text-slate-900 md:px-8 md:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(100,116,139,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(100,116,139,0.08)_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="relative mx-auto flex w-full max-w-[1280px] flex-col gap-5">
        <section className="rounded-[24px] border border-slate-300/70 bg-[#f7f7f6] px-6 py-8 shadow-[0_20px_50px_-35px_rgba(2,6,23,0.25)] md:px-12 md:py-12">
          <p className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-[#e8e7e5] px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.28em] text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />ADES Labs · Companion Tool
          </p>

          <h1 className="mt-8 max-w-5xl text-5xl leading-[1.05] tracking-tight text-slate-900 md:text-7xl">
            Your AI is not expensive.
            <span className="ml-0 block font-serif italic text-slate-500 md:ml-3 md:inline">Your context is messy.</span>
          </h1>

          <p className="mt-7 max-w-3xl text-xl leading-relaxed text-slate-600 md:text-[38px] md:leading-[1.22] md:text-balance">
            THOR helps Claude and ChatGPT users get more output from the same AI plan by reducing token waste — without compromising quality.
          </p>

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.35em] text-slate-700">More output · Fewer limits · Lower cost</p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <a
              href="https://chromewebstore.google.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1d2a49] to-[#1b315e] px-7 py-3.5 text-lg font-semibold text-white shadow-lg shadow-blue-950/20 transition hover:-translate-y-0.5 hover:from-[#21325a] hover:to-[#21407a]"
              data-thor-cta="install-claude"
            >
              Install THOR for Claude <span aria-hidden>→</span>
            </a>
            <a
              href="mailto:ms.sorgente@gmail.com?subject=THOR%20early%20access&body=Hi%2C%20I%27d%20like%20to%20join%20THOR%20early%20access."
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-lg font-medium text-slate-800 transition hover:bg-slate-50"
              data-thor-cta="early-access"
            >
              ✧ Join early access
            </a>
            <Link href="/" className="px-2 text-2xl text-slate-500 transition hover:text-slate-800" aria-label="Back to ADES">
              ←
            </Link>
            <span className="text-3xl text-slate-600">Back to ADES</span>
          </div>
        </section>

        <section className="scroll-mt-20 rounded-[18px] border border-slate-300/70 bg-[#f7f7f6] pt-2 shadow-[0_10px_30px_-28px_rgba(2,6,23,0.35)]">
          <div className="flex items-center justify-between px-5 pb-3 pt-2">
            <h2 className="text-[46px] leading-none tracking-tight text-slate-900">Compare your options</h2>
            <p className="hidden text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500 md:block">Capability matrix</p>
          </div>
          <div className="overflow-x-auto border-t border-slate-300/70">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-4 py-3 font-semibold">Capability</th>
                  <th className="px-4 py-3 font-semibold">No tool</th>
                  <th className="px-4 py-3 font-semibold">Manual cleanup</th>
                  <th className="px-4 py-3 font-semibold">THOR Free</th>
                  <th className="px-4 py-3 font-semibold">THOR Pro / Coming soon</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.label} className="border-t border-slate-200/80 text-[15px]">
                    <td className="px-4 py-3 font-medium text-slate-800">{row.label}</td>
                    <td className="px-4 py-3 text-slate-500">— {row.noTool}</td>
                    <td className="px-4 py-3 text-slate-600">{row.manual}</td>
                    <td className="px-4 py-3 font-medium text-emerald-700">✓ {row.free}</td>
                    <td className="px-4 py-3 font-medium text-blue-600">{row.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
          <article className="rounded-[18px] border border-slate-300/70 bg-[#f7f7f6] p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">// 02 — How THOR works</p>
            <h2 className="mt-3 text-5xl leading-none tracking-tight text-slate-900">From messy prompt to clean signal.</h2>
            <ol className="mt-6 space-y-3">
              {steps.map((step, index) => (
                <li key={step} className="flex items-center gap-3 rounded-xl border border-slate-300 bg-[#f9f9f8] p-3 text-[15px] text-slate-700">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#1c2f52] text-xs font-semibold text-white">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </article>

          <div className="space-y-4">
            <article className="rounded-[14px] border border-slate-800/60 bg-gradient-to-br from-[#162746] to-[#121d38] p-6 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-200">Free plan · MVP</p>
              <h3 className="mt-3 text-4xl leading-none tracking-tight">Start saving tokens today.</h3>
              <ul className="mt-5 space-y-2 text-sm text-blue-50">
                <li>✦ Chrome extension</li>
                <li>✦ Claude + ChatGPT support</li>
                <li>✦ Local token-waste checks (no API required)</li>
                <li>✦ 2 AI optimizations/day using a nano model</li>
                <li>✦ Basic reusable memory suggestions</li>
              </ul>
              <a
                href="https://chromewebstore.google.com"
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-[#ff6424] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#ff7a43]"
                data-thor-cta="install-free"
              >
                Install free →
              </a>
            </article>

            <article className="rounded-[14px] border border-dashed border-slate-300 bg-[radial-gradient(circle,rgba(148,163,184,0.22)_1px,transparent_1px)] bg-[size:12px_12px] p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-indigo-500">Coming soon</p>
              <h3 className="mt-3 text-4xl leading-none tracking-tight text-slate-900">THOR Pro</h3>
              <ul className="mt-5 space-y-2 text-sm text-slate-700">
                <li>✧ GitHub context packs for vibe-coding repos</li>
                <li>✧ Cursor workflow support</li>
                <li>✧ Pro usage dashboard and higher limits</li>
              </ul>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
