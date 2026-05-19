import Image from "next/image";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-6 md:px-8">
      <section className="ades-panel relative overflow-hidden rounded-[2rem] border-slate-200/90 px-6 py-10 md:px-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(99,102,241,0.14),transparent_42%),radial-gradient(circle_at_86%_20%,rgba(147,51,234,0.13),transparent_36%)]" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Image src="/logo-ades.svg" alt="ADES logo" width={150} height={44} className="h-9 w-auto" priority />
            <Link href="/" className="ades-ghost-btn px-4 py-2 text-sm">← Back home</Link>
          </div>
          <h1 className="mt-7 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">Privacy & Data Use (Beta)</h1>
          <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">Do not enter confidential or sensitive personal data during beta.</p>
          <div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-700">
            <section><h2 className="text-base font-semibold text-slate-900">What ADES collects</h2><ul className="mt-2 list-disc space-y-1 pl-5"><li>Google sign-in basics (email, display name, account id).</li><li>Project content you create (title, prompt, nodes, reflections, evals, safeguards, exports).</li><li>Usage and quota counters to prevent abuse.</li></ul></section>
            <section><h2 className="text-base font-semibold text-slate-900">What is sent to OpenAI</h2><ul className="mt-2 list-disc space-y-1 pl-5"><li>Generation payload only: prompt and related context fields you provide.</li><li>Server-side metadata needed for generation and quota checks.</li><li>No raw Google auth token is sent to OpenAI.</li></ul></section>
            <section><h2 className="text-base font-semibold text-slate-900">Sensitive data minimization</h2><p>ADES is for workflow planning, not storing highly sensitive personal data or secrets. Keep prompts anonymized wherever possible.</p></section>
            <section><h2 className="text-base font-semibold text-slate-900">Project deletion</h2><p>You can delete projects from the dashboard. Deletion removes the project from your workspace and updates usage counters used for platform controls.</p></section>
          </div>
        </div>
      </section>
    </main>
  );
}
