import { AppShell } from "@/components/app-shell";
import { DemoProjectView } from "@/components/demo/demo-project-view";

export default function DemoPage() {
  return (
    <AppShell title="Interactive demo" subtitle="A guided walkthrough of how ADES structures agent design." breadcrumbLabel="Demo">
      {/* Demo page intentionally uses local static data only. It does not import generation routes or Firebase write helpers. */}
      <DemoProjectView />
    </AppShell>
  );
}
