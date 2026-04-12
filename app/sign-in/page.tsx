import { AppShell } from "@/components/app-shell";

export default function SignInPage() {
  return (
    <AppShell
      title="Sign in"
      subtitle="Start an agent design session, capture assumptions, and share clear outputs your PM team can review."
    >
      <section className="mx-auto mt-8 w-full max-w-md rounded-2xl border border-ades-soft bg-white p-6">
        <h2 className="text-xl font-semibold tracking-tight">Welcome to ADES</h2>
        <p className="mt-2 text-sm text-slate-600">
          Create better agent specs faster with built-in reflection, critique, and evaluation scaffolds.
        </p>
        <button
          type="button"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Continue with Google
        </button>
      </section>
    </AppShell>
  );
}
