import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/app-shell";

export default function ProjectPrintPage({ params }: { params: { id: string } }) {
  return (
    <AppShell
      title={`Project ${params.id} · Print + export`}
      subtitle="Print-ready shell for design summary, reflections, critique, eval signals, and business outcomes."
    >
      <ProtectedRoute>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <PrintSection title="Goal and scope" description="What business and user problem this design should solve." />
            <PrintSection title="Task map" description="Key workflow sequence and dependencies before implementation." />
            <PrintSection title="Reflections + critique" description="Uncertainty checks, assumptions, and challenge prompts." />
            <PrintSection title="Eval + business metrics" description="Quality and business success criteria for launch readiness." />
          </div>

          <aside className="ades-panel h-fit">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Export checklist</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>• Keep headings concise for PDF readability.</li>
              <li>• Ensure reflection and handoff are explicit.</li>
              <li>• Include at least one measurable business KPI.</li>
            </ul>
          </aside>
        </div>
      </ProtectedRoute>
    </AppShell>
  );
}

function PrintSection({ title, description }: { title: string; description: string }) {
  return (
    <section className="ades-panel">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      <div className="mt-4 min-h-28 rounded-xl border border-dashed border-slate-300 bg-slate-50" />
    </section>
  );
}
