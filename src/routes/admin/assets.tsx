import { pageMeta } from "@/lib/route-meta";
import { createFileRoute } from "@tanstack/react-router";
import { SoftwareHeader } from "@/components/dashboard/SoftwareHeader";
import { AssetsDesignSystemContent } from "@/routes/assets";

export const Route = createFileRoute("/admin/assets")({
  head: () => pageMeta('Design system and assets', 'Browse Esportific design system components and assets.'),
  component: AdminAssetsPage,
});

function AdminAssetsPage() {
  return (
    <>
      <SoftwareHeader title="Design System & Assets" variant="admin" />
      <AssetsDesignSystemContent />
    </>
  );
}
