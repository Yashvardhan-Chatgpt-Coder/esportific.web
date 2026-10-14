import { pageMeta } from "@/lib/route-meta";
import { Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import { EventsPage } from "./events/index";

export const Route = createFileRoute("/events")({
  head: () => pageMeta('Events', 'Browse and manage your esports tournaments.'),
  component: EventsRoute,
});

function EventsRoute() {
  const location = useLocation();
  return location.pathname === "/events" || location.pathname === "/events/" ? <EventsPage /> : <Outlet />;
}
