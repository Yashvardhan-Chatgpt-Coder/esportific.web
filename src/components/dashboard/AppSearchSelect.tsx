"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronDown, Search } from "lucide-react";
import { Command } from "cmdk";

type AppSearchSelectOption = {
  label: string;
  value: string;
  icon?: React.ReactNode;
};

type AppSearchSelectProps = {
  value: string;
  options: AppSearchSelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  compact?: boolean;
};

export function AppSearchSelect({
  value,
  options,
  placeholder = "Select option",
  onChange,
  className = "",
  disabled = false,
  compact = false,
}: AppSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className={className}>
      <Popover.Root
        open={disabled ? false : open}
        onOpenChange={(nextOpen) => !disabled && setOpen(nextOpen)}
      >
        <Popover.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={`flex h-[40px] w-full cursor-pointer items-center justify-between rounded-[8px] border-2 border-[#eef0f4] bg-white text-[14px] font-normal text-[#000000] outline-none transition-all duration-200 hover:bg-[#fcfdfd] disabled:cursor-not-allowed disabled:bg-[#f7f8fb] disabled:text-[#9aa1b0] ${
              compact ? "px-2.5" : "px-3"
            }`}
          >
            <span
              className={`flex min-w-0 items-center ${compact ? "gap-1.5" : "gap-2"} ${
                selectedOption ? "text-[#000000]" : "text-[#9aa1b0]"
              }`}
            >
              {selectedOption?.icon}
              <span className="truncate">{selectedOption?.label ?? placeholder}</span>
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
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  onWheel={(event) => event.stopPropagation()}
                  onTouchMove={(event) => event.stopPropagation()}
                  className="w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-[12px] border border-[#e2e5ec] bg-white shadow-lg"
                >
                  <Command label="Search options" className="flex flex-col h-full">
                    <div className={`flex items-center ${compact ? "px-2.5" : "px-3"}`}>
                      <Search className="mr-2 h-4 w-4 text-[#9aa1b0]" />
                      <Command.Input
                        placeholder="Search..."
                        data-no-style
                        className={`w-full border-none bg-transparent text-[14px] text-[#000000] outline-none placeholder:text-[#9aa1b0] ${
                          compact ? "h-[38px]" : "h-[44px]"
                        }`}
                      />
                    </div>
                    <Command.List
                      className={`overflow-y-auto overscroll-contain ${
                        compact ? "max-h-[196px] p-1" : "max-h-[220px] p-1.5"
                      }`}
                    >
                      <Command.Empty className="py-6 text-center text-[13px] text-[#9aa1b0]">
                        No results found.
                      </Command.Empty>
                      {options.map((option) => (
                        <Command.Item
                          key={option.value}
                          value={option.label}
                          onSelect={() => {
                            onChange(option.value);
                            setOpen(false);
                          }}
                          className={`flex cursor-pointer items-center justify-between gap-2 rounded-[8px] text-[14px] font-medium outline-none transition-colors data-[selected=true]:bg-[#f0f1f3] data-[selected=true]:text-[#000000] data-[highlighted]:bg-[#f7f8fb] data-[highlighted]:text-[#000000] ${
                            compact ? "px-2 py-1.5" : "px-3 py-2"
                          }`}
                        >
                          <div
                            className={`flex min-w-0 items-center ${compact ? "gap-2" : "gap-3"}`}
                          >
                            {option.icon}
                            <span className="truncate">{option.label}</span>
                          </div>
                          {value === option.value && (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#000000]" />
                          )}
                        </Command.Item>
                      ))}
                    </Command.List>
                  </Command>
                </motion.div>
              </Popover.Content>
            </Popover.Portal>
          )}
        </AnimatePresence>
      </Popover.Root>
    </div>
  );
}
