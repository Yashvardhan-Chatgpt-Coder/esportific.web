import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Calculator,
  Gamepad2,
  Headset,
  Home,
  Image,
  Layers,
  type LucideIcon,
  Swords,
  Database,
  Users,
} from "lucide-react";
import { SidebarCollapseButton } from "@/components/dashboard/SidebarCollapseButton";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { cn } from "@/lib/utils";
import { ContactSupportDialog } from "@/components/dashboard/ContactSupportDialog";

const adminNav = [
  { title: "Home", url: "/admin", icon: Home, exact: true },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Support", url: "/admin/support", icon: Headset },
  { title: "Events", url: "/admin/events", icon: Swords },
  { title: "Scoring rules", url: "/admin/scoring-rules", icon: Calculator },
  { title: "Templates", url: "/admin/templates", icon: Image },
  { title: "Assets", url: "/admin/assets", icon: Layers },
  { title: "Games", url: "/admin/games", icon: Gamepad2 },
  { title: "Cloudinary", url: "/admin/cloudinary", icon: Database },
];

function NavItem({
  item,
  active,
  collapsed,
}: {
  item: { title: string; url: string; icon: LucideIcon; exact?: boolean };
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      to={item.url}
      title={collapsed ? item.title : undefined}
      data-active={active ? "true" : undefined}
      className={cn(
        "flex h-9 w-full cursor-pointer items-center rounded-[6px] text-[14px] transition-all duration-300 ease-in-out justify-start",
        collapsed ? "pl-[18px] pr-0" : "pl-3 pr-3",
        active
          ? "bg-[#f0f1f3] font-medium text-[#000000]"
          : "text-[#666666] hover:bg-[#f7f6fb] hover:text-[#000000]",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span
        className={cn(
          "overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out",
          collapsed ? "max-w-0 opacity-0 ml-0" : "max-w-[200px] opacity-100 ml-3",
        )}
      >
        {item.title}
      </span>
    </Link>
  );
}

export function AdminSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string, exact?: boolean) =>
    exact ? path === url : path === url || path.startsWith(`${url}/`);
  const { collapsed, toggle } = useSidebarCollapsed();
  const navigate = useNavigate();
  const [supportOpen, setSupportOpen] = useState(false);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const activeIndex = Math.max(
        0,
        adminNav.findIndex((item) => isActive(item.url, item.exact)),
      );
      const numberKey = event.key.match(/^[1-9]$/)?.[0];

      if (event.ctrlKey && event.key.toLowerCase() === "h") {
        event.preventDefault();
        navigate({ to: "/admin" });
        return;
      }

      if (event.ctrlKey && numberKey) {
        const nextItem = adminNav[Number(numberKey) - 1];
        if (!nextItem) return;
        event.preventDefault();
        navigate({ to: nextItem.url });
        return;
      }

      const isArrowCycle = event.altKey && (event.key === "ArrowDown" || event.key === "ArrowUp");
      if (!isArrowCycle) return;
      event.preventDefault();
      const direction = event.key === "ArrowUp" ? -1 : 1;
      const nextIndex = (activeIndex + direction + adminNav.length) % adminNav.length;
      navigate({ to: adminNav[nextIndex].url });
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [navigate, path]);

  return (
    <aside
      className={cn(
        "es-app-sidebar relative flex min-h-0 flex-1 flex-col border-r border-[#e5e7ef] bg-white transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-[260px]",
      )}
    >
      <SidebarCollapseButton collapsed={collapsed} onToggle={toggle} />

      <nav
        className={cn(
          "min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-6 pt-2",
          collapsed ? "px-2" : "px-3",
        )}
      >
        <div className="space-y-0.5">
          {adminNav.map((item) => (
            <NavItem
              key={item.title}
              item={item}
              active={isActive(item.url, item.exact)}
              collapsed={collapsed}
            />
          ))}
        </div>
      </nav>

      <button
        type="button"
        onClick={() => setSupportOpen(true)}
        title={collapsed ? "Contact support" : undefined}
        className={cn(
          "mt-auto flex h-[56px] cursor-pointer items-center border-t border-[#eef0f5] text-[13px] text-[#8a90a0] transition-all duration-300 ease-in-out hover:bg-[#f9fbfc] hover:text-[#000000]",
          collapsed ? "justify-center px-0" : "gap-3 px-6",
        )}
      >
        <Headset className="h-5 w-5 shrink-0" />
        <span
          className={cn(
            "overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out",
            collapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100",
          )}
        >
          Contact support
        </span>
      </button>
      <ContactSupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
    </aside>
  );
}
