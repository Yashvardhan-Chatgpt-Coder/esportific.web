import { pageMeta } from "@/lib/route-meta";
import { Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import { AdminEventsPage } from "./events/index";

export const Route = createFileRoute("/admin/events")({
  head: () => pageMeta('Manage events', 'Review and manage events across the Esportific platform.'),
  component: AdminEventsRoute,
});

function AdminEventsRoute() {
  const location = useLocation();
  return location.pathname === "/admin/events" || location.pathname === "/admin/events/" ? <AdminEventsPage /> : <Outlet />;
}
