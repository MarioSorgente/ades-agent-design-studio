import { AppShell } from "@/components/app-shell";
import { DemoProjectView } from "@/components/demo/demo-project-view";

export default function DemoPage() {
  return (
    <AppShell
      title="Interactive demo"
      subtitle="Explore a complete ADES sample project locally — no auth, no API calls, no generation cost."
      breadcrumbLabel="Demo"
    >
      {/* Demo page intentionally uses local static data only. It does not import generation routes or Firebase write helpers. */}
      <DemoProjectView />
    </AppShell>
  );
}
