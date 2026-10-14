import { cn } from "@/lib/utils";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";

type SidebarBrandProps = {
  variant?: "organizer" | "admin";
  className?: string;
};

export function SidebarBrand({ variant = "organizer", className }: SidebarBrandProps) {
  const isAdmin = variant === "admin";
  const { collapsed } = useSidebarCollapsed();

  return (
    <div
      className={cn(
        "es-sidebar-brand relative flex h-[72px] shrink-0 flex-col items-center justify-center border-b border-r border-[#e5e7ef] bg-white transition-[width] duration-300 ease-in-out overflow-hidden",
        collapsed ? "w-[72px]" : "w-[260px]",
        className,
      )}
    >
      {/* Full logo — fades out when collapsed */}
      <img
        src="/Brand/new-logo.png"
        alt="Rangrove Points"
        className={cn(
          "absolute w-auto object-contain transition-opacity duration-300 ease-in-out",
          isAdmin ? "h-9" : "h-11",
          collapsed ? "opacity-0 pointer-events-none" : "opacity-100",
        )}
      />

      {/* Compact logo — fades in when collapsed */}
      <img
        src="/Brand/new-logo - Copy.png"
        alt="Rangrove Points"
        className={cn(
          "absolute w-auto object-contain transition-opacity duration-300 ease-in-out",
          collapsed ? "h-8 opacity-100" : "h-8 opacity-0 pointer-events-none",
        )}
      />

      {/* Admin label — only in expanded mode */}
      {isAdmin && (
        <span
          className={cn(
            "absolute bottom-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#9aa1b0] transition-opacity duration-300 ease-in-out",
            collapsed ? "opacity-0" : "opacity-100",
          )}
        >
          Admin
        </span>
      )}
    </div>
  );
}
