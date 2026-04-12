import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/app-shell";

export default function DashboardPage() {
  return (
    <AppShell
      title="Dashboard"
      subtitle="Your agent design workspace. Start a new design or continue an existing draft."
      actions={
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          New design
        </button>
      }
    >
      <ProtectedRoute>
        <article className="rounded-2xl border border-dashed border-ades-soft bg-white p-10 text-center">
          <h2 className="text-lg font-semibold">No projects yet</h2>
          <p className="mt-2 text-sm text-slate-600">
            Your saved agent designs will appear here once you create your first project.
          </p>
        </article>
      </ProtectedRoute>
    </AppShell>
  );
}
