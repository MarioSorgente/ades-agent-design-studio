import Image from "next/image";
import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-6 md:px-8">
      <section className="ades-panel relative overflow-hidden rounded-[2rem] border-slate-200/90 px-6 py-10 md:px-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.12),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(147,51,234,0.12),transparent_36%)]" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Image src="/logo-ades.svg" alt="ADES logo" width={150} height={44} className="h-9 w-auto" priority />
            <Link href="/" className="ades-ghost-btn px-4 py-2 text-sm">← Back home</Link>
          </div>
          <h1 className="mt-7 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">Terms & Conditions (Beta)</h1>
          <div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-700">
            <section><h2 className="text-base font-semibold text-slate-900">Beta service</h2><p>ADES is provided as a beta product for design exploration. Features may change, and occasional interruptions can occur.</p></section>
            <section><h2 className="text-base font-semibold text-slate-900">Responsible usage</h2><p>You agree not to upload unlawful content, credentials, or sensitive personal data. Use anonymized examples during testing.</p></section>
            <section><h2 className="text-base font-semibold text-slate-900">Your content</h2><p>You retain ownership of your project content. By using ADES, you authorize processing needed to provide generation, critique, storage, and export features.</p></section>
            <section><h2 className="text-base font-semibold text-slate-900">Deletion and access</h2><p>You can delete projects from the dashboard. Access is restricted to authenticated users and their own workspace data.</p></section>
            <section><h2 className="text-base font-semibold text-slate-900">No warranty</h2><p>Results are generated and may be incomplete or incorrect. You are responsible for review before production use.</p></section>
          </div>
        </div>
      </section>
    </main>
  );
}
