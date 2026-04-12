import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/app-shell";

export default function ProjectPrintPage({ params }: { params: { id: string } }) {
  return (
    <AppShell
      title={`Project ${params.id} · Print summary`}
      subtitle="Print-friendly overview of the design intent, reflections, evaluations, and business outcomes."
    >
      <ProtectedRoute>
        <div className="space-y-4">
          <PrintSection title="Goal" description="What user problem is this agent intended to solve?" />
          <PrintSection
            title="Reflections"
            description="Key assumptions, uncertainty checks, and safety considerations."
          />
          <PrintSection
            title="Evaluations"
            description="How quality will be measured before and after launch."
          />
          <PrintSection
            title="Business metrics"
            description="Success indicators such as time saved, escalation rate, and user trust."
          />
        </div>
      </ProtectedRoute>
    </AppShell>
  );
}

function PrintSection({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-2xl border border-ades-soft bg-white p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      <div className="mt-4 min-h-24 rounded-lg border border-dashed border-ades-soft bg-slate-50" />
    </section>
  );
}
