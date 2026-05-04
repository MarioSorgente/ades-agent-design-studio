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
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-10 md:px-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-12">
        <p className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
          THOR · Standalone Validation
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 md:text-6xl">
          Your AI is not expensive. Your context is messy.
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-slate-600">
          THOR helps Claude and ChatGPT users get more output from the same AI plan by reducing token waste without compromising quality.
        </p>
        <p className="mt-3 text-base font-medium text-slate-800">More output. Fewer limits. Lower cost.</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="https://chromewebstore.google.com"
            target="_blank"
            rel="noreferrer"
            className="ades-primary-btn px-6 py-3"
            data-thor-cta="install-claude"
          >
            Install THOR for Claude
          </a>
          <a
            href="mailto:ms.sorgente@gmail.com?subject=THOR%20early%20access&body=Hi%2C%20I%27d%20like%20to%20join%20THOR%20early%20access."
            className="ades-ghost-btn px-6 py-3"
            data-thor-cta="early-access"
          >
            Join early access
          </a>
          <Link href="/" className="ades-ghost-btn px-6 py-3">
            Back to ADES
          </Link>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Compare your options</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-600">
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
                  <td className="px-3 py-3 text-slate-600">{row.noTool}</td>
                  <td className="px-3 py-3 text-slate-600">{row.manual}</td>
                  <td className="px-3 py-3 text-slate-700">{row.free}</td>
                  <td className="px-3 py-3 text-violet-700">{row.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">How THOR works</h2>
          <ol className="mt-4 space-y-3 text-sm text-slate-700">
            {steps.map((step) => (
              <li key={step} className="rounded-xl border border-slate-200 bg-slate-50 p-3">{step}</li>
            ))}
          </ol>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Free plan (MVP)</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li>• Chrome extension</li>
            <li>• Claude + ChatGPT support</li>
            <li>• Local token-waste checks (no API required)</li>
            <li>• 2 AI optimizations/day using a nano model</li>
            <li>• Basic reusable memory suggestions</li>
          </ul>

          <h3 className="mt-7 text-lg font-semibold text-slate-900">Coming soon</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>• GitHub context packs for vibe-coding repos</li>
            <li>• Cursor workflow support</li>
            <li>• Pro usage dashboard and higher limits</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
