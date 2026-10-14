import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { SidebarBrand } from "@/components/dashboard/SidebarBrand";
import { getStoredUser } from "@/lib/api";

type OrganizerLayoutProps = {
  header: React.ReactNode;
  children: React.ReactNode;
};

export function OrganizerLayout({ header, children }: OrganizerLayoutProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate({ to: "/login" });
      return;
    }

    const user = getStoredUser();
    if (user?.role === "admin") {
      navigate({ to: "/admin" });
    }
  }, [navigate]);

  return (
    <div className="es-app-shell h-screen overflow-hidden bg-[#f7f8fb] text-[#000000]">
      <div className="flex h-screen">
        <div className="flex h-screen shrink-0 flex-col">
          <Link to="/" aria-label="Go to home" className="block shrink-0">
            <SidebarBrand variant="organizer" />
          </Link>
          <AppSidebar />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {header}
          <motion.div
            className="flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
