import { useState, type ReactNode } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AnimatePresence, motion } from "framer-motion";

type AppDropdownItem = {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  onSelect?: () => void;
};

type AppDropdownMenuProps = {
  trigger: ReactNode;
  items: AppDropdownItem[];
  align?: "start" | "center" | "end";
  widthClass?: string;
};

export function AppDropdownMenu({
  trigger,
  items,
  align = "end",
  widthClass = "w-[220px]",
}: AppDropdownMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <AnimatePresence>
        {open && (
          <DropdownMenu.Portal forceMount>
            <DropdownMenu.Content asChild sideOffset={8} align={align} className="z-[90]">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                onWheel={(event) => event.stopPropagation()}
                onTouchMove={(event) => event.stopPropagation()}
                className={`${widthClass} max-h-[260px] overflow-y-auto overscroll-contain rounded-[12px] border border-[#e2e5ec] bg-white p-1.5 shadow-lg`}
              >
                {items.map((item) => (
                  <DropdownMenu.Item
                    key={item.label}
                    onClick={item.onSelect}
                    className={`flex cursor-pointer items-center gap-3 rounded-[8px] px-3 py-2 text-[14px] font-medium outline-none transition-colors data-[highlighted]:bg-[#f7f8fb] ${
                      item.danger
                        ? "text-[#dc2626] data-[highlighted]:bg-[#fff5f5]"
                        : "text-[#4b5563] data-[highlighted]:text-[#000000]"
                    }`}
                  >
                    {item.icon && (
                      <span
                        className={`flex items-center justify-center ${
                          item.danger ? "text-[#dc2626]" : "text-[#666666]"
                        }`}
                      >
                        {item.icon}
                      </span>
                    )}
                    {item.label}
                  </DropdownMenu.Item>
                ))}
              </motion.div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        )}
      </AnimatePresence>
    </DropdownMenu.Root>
  );
}
