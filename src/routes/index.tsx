import { pageMeta } from "@/lib/route-meta";
import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { OrganizerLayout } from "@/components/dashboard/OrganizerLayout";
import { SoftwareHeader } from "@/components/dashboard/SoftwareHeader";

export const Route = createFileRoute("/")({
  head: () => pageMeta('Dashboard', 'Review tournament activity, team totals, and recent esports events.'),
  component: Index,
});

function Index() {
  return (
    <OrganizerLayout header={<SoftwareHeader title="Home" />}>
      <main className="min-h-0 flex-1 overflow-hidden">
        <Dashboard />
      </main>
    </OrganizerLayout>
  );
}
