import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/app-shell";

export default function ProjectPage({ params }: { params: { id: string } }) {
  return (
    <AppShell
      title={`Project ${params.id}`}
      subtitle="Three-panel studio shell for designing agent flow, reviewing structure, and preparing critique."
    >
      <ProtectedRoute>
        <div className="grid min-h-[65vh] gap-4 md:grid-cols-[240px_minmax(0,1fr)_280px]">
          <aside className="rounded-2xl border border-ades-soft bg-white p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Left panel</h2>
            <p className="mt-2 text-sm text-slate-600">Placeholder for project map, blocks, and navigation.</p>
          </aside>

          <section className="rounded-2xl border border-ades-soft bg-white p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Canvas</h2>
            <div className="mt-3 flex min-h-[48vh] items-center justify-center rounded-xl border border-dashed border-ades-soft bg-slate-50 text-sm text-slate-500">
              Center canvas placeholder
            </div>
          </section>

          <aside className="rounded-2xl border border-ades-soft bg-white p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Inspector</h2>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              <li>• Critique placeholder</li>
              <li>• Reflection placeholder</li>
              <li>• Evals placeholder</li>
            </ul>
          </aside>
        </div>
      </ProtectedRoute>
    </AppShell>
  );
}
