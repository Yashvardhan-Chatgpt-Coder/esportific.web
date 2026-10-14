import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { GlobalPageLoader } from "@/components/ui/GlobalPageLoader";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPendingComponent: () => <GlobalPageLoader />,
    defaultPendingMs: 250,
    defaultPendingMinMs: 450,
  });

  return router;
};
