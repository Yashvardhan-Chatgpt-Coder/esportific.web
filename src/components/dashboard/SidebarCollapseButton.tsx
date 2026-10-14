import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type SidebarCollapseButtonProps = {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
};

export function SidebarCollapseButton({
  collapsed,
  onToggle,
  className,
}: SidebarCollapseButtonProps) {
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onToggle}
            aria-label={label}
            aria-expanded={!collapsed}
            className={cn(
              "absolute top-3 z-20 grid h-7 w-7 cursor-pointer place-items-center rounded-full border border-[#e5e7ef] bg-white text-[#4b5563] shadow-[0_2px_8px_rgba(30,41,59,0.08)] transition-all duration-300 ease-in-out hover:bg-[#f7f8fb] hover:text-[#000000]",
              "-right-3.5",
              className,
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            ) : (
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{label} (Alt+S)</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
