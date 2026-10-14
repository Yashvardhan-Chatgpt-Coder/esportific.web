import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronDown } from "lucide-react";

type AppSelectOption = {
  label: string;
  value: string;
};

type AppSelectProps = {
  value: string;
  options: AppSelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
};

export function AppSelect({
  value,
  options,
  placeholder = "Select option",
  onChange,
  className = "",
  disabled = false,
}: AppSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className={className}>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={`flex h-[40px] w-full items-center justify-between rounded-[8px] border-2 border-[#eef0f4] px-3 text-[14px] font-normal outline-none transition-all duration-200 ${
              disabled
                ? "cursor-not-allowed bg-[#f4f6fa] text-[#9aa1b0]"
                : "cursor-pointer bg-white text-[#000000] hover:bg-[#fcfdfd]"
            }`}
          >
            <span
              className={`min-w-0 truncate pr-2 ${
                disabled ? "text-[#9aa1b0]" : selectedOption ? "text-[#000000]" : "text-[#9aa1b0]"
              }`}
            >
              {selectedOption?.label ?? placeholder}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-[#9aa1b0] transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>
        </Popover.Trigger>

        <AnimatePresence>
          {open && (
            <Popover.Portal forceMount>
              <Popover.Content
                align="start"
                sideOffset={8}
                collisionPadding={12}
                asChild
                className="z-[90]"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -6 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  onWheel={(event) => event.stopPropagation()}
                  onTouchMove={(event) => event.stopPropagation()}
                  className="origin-top w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-[12px] border border-[#e2e5ec] bg-white p-1.5 shadow-lg will-change-transform"
                >
                  <div className="max-h-[220px] overflow-y-auto overscroll-contain pr-1">
                    {options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          onChange(option.value);
                          setOpen(false);
                        }}
                        className={`flex w-full cursor-pointer items-center justify-between rounded-[8px] px-3 py-2 text-left text-[14px] font-medium outline-none transition-colors ${
                          option.value === value
                            ? "bg-[#f0f1f3] text-[#000000]"
                            : "text-[#4b5563] hover:bg-[#f7f8fb] hover:text-[#000000]"
                        }`}
                      >
                        {option.label}
                        {option.value === value && (
                          <CheckCircle2 className="h-4 w-4 text-[#000000]" />
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </Popover.Content>
            </Popover.Portal>
          )}
        </AnimatePresence>
      </Popover.Root>
    </div>
  );
}
