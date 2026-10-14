import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calculator, Headset, Home, type LucideIcon, Swords, Users } from "lucide-react";
import { SidebarCollapseButton } from "@/components/dashboard/SidebarCollapseButton";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { cn } from "@/lib/utils";
import { ContactSupportDialog } from "@/components/dashboard/ContactSupportDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const primaryNav = [
  { title: "Home", url: "/", icon: Home },
  { title: "Events", url: "/events", icon: Swords },
];

const workflowNav = [
  { title: "Scoring rules", url: "/scoring-rules", icon: Calculator },
  { title: "Teams", url: "/teams", icon: Users },
];

function NavItem({
  item,
  active,
  collapsed,
}: {
  item: { title: string; url: string; icon: LucideIcon };
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  const link = (
    <Link
      to={item.url}
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

  if (!collapsed) return link;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.title}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string) => (url === "/" ? path === "/" : path.startsWith(url));
  const { collapsed, toggle } = useSidebarCollapsed();
  const navigate = useNavigate();
  const navItems = [...primaryNav, ...workflowNav];
  const [supportOpen, setSupportOpen] = useState(false);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const activeIndex = Math.max(
        0,
        navItems.findIndex((item) => isActive(item.url)),
      );
      const numberKey = event.key.match(/^[1-9]$/)?.[0];

      if (event.ctrlKey && event.key.toLowerCase() === "h") {
        event.preventDefault();
        navigate({ to: "/" });
        return;
      }

      if (event.ctrlKey && numberKey) {
        const nextItem = navItems[Number(numberKey) - 1];
        if (!nextItem) return;
        event.preventDefault();
        navigate({ to: nextItem.url });
        return;
      }

      const isArrowCycle = event.altKey && (event.key === "ArrowDown" || event.key === "ArrowUp");
      if (!isArrowCycle) return;
      event.preventDefault();
      const direction = event.key === "ArrowUp" ? -1 : 1;
      const nextIndex = (activeIndex + direction + navItems.length) % navItems.length;
      navigate({ to: navItems[nextIndex].url });
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
          {primaryNav.map((item) => (
            <NavItem
              key={item.title}
              item={item}
              active={isActive(item.url)}
              collapsed={collapsed}
            />
          ))}
        </div>

        <div
          className={cn(
            "es-app-sidebar-separator my-4 h-px bg-[#eef0f5] transition-all duration-300",
            collapsed ? "mx-2" : "mx-0",
          )}
        />

        <div className="space-y-0.5">
          {workflowNav.map((item) => (
            <NavItem
              key={item.title}
              item={item}
              active={isActive(item.url)}
              collapsed={collapsed}
            />
          ))}
        </div>
      </nav>

      {collapsed ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setSupportOpen(true)}
                className="mt-auto flex h-[56px] cursor-pointer items-center justify-center border-t border-[#eef0f5] px-0 text-[13px] text-[#8a90a0] transition-all duration-300 ease-in-out hover:bg-[#f9fbfc] hover:text-[#000000]"
              >
                <Headset className="h-5 w-5 shrink-0" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Contact support</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <button
          type="button"
          onClick={() => setSupportOpen(true)}
          className={cn(
            "mt-auto flex h-[56px] cursor-pointer items-center border-t border-[#eef0f5] text-[13px] text-[#8a90a0] transition-all duration-300 ease-in-out hover:bg-[#f9fbfc] hover:text-[#000000]",
            "gap-3 px-6",
          )}
        >
          <Headset className="h-5 w-5 shrink-0" />
          <span className="max-w-[160px] overflow-hidden whitespace-nowrap opacity-100 transition-all duration-300 ease-in-out">
            Contact support
          </span>
        </button>
      )}
      <ContactSupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
    </aside>
  );
}
