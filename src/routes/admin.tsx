import { pageMeta } from "@/lib/route-meta";
import { useEffect } from "react";
import { Outlet, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { AdminSidebar } from "@/components/dashboard/AdminSidebar";
import { SidebarBrand } from "@/components/dashboard/SidebarBrand";
import { getStoredUser } from "@/lib/api";

export const Route = createFileRoute("/admin")({
  head: () => pageMeta('Admin', 'Administration tools for the Esportific platform.'),
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLoginPage = location.pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) return;

    const token = localStorage.getItem("token");
    const user = getStoredUser();
    if (!token || user?.role !== "admin") {
      navigate({ to: "/admin/login" });
    }
  }, [isLoginPage, navigate]);

  if (isLoginPage) {
    return <Outlet />;
  }

  return (
    <div className="es-app-shell h-screen overflow-hidden bg-[#f7f8fb] text-[#000000]">
      <div className="flex h-screen">
        <div className="flex h-screen shrink-0 flex-col">
          <SidebarBrand variant="admin" />
          <AdminSidebar />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
