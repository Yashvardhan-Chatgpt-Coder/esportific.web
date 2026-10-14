"use client";

import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, FileDown, Image as ImageIcon, MoreVertical, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const itemClass =
  "flex cursor-pointer items-center gap-3 rounded-[8px] px-3 py-2 text-[14px] font-medium outline-none transition-colors data-[highlighted]:bg-[#f7f8fb] text-[#4b5563] data-[highlighted]:text-[#000000]";

const subContentClass =
  "z-[90] min-w-[140px] overflow-hidden rounded-[12px] border border-[#e2e5ec] bg-white p-1.5 shadow-lg";

interface MatchCardMenuProps {
  onExportImage: () => void;
  onExportExcel: () => void;
  onDelete: () => void;
}

export function MatchCardMenu({ onExportImage, onExportExcel, onDelete }: MatchCardMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <TooltipProvider>
      <Tooltip open={open ? false : undefined}>
        <DropdownMenu.Root open={open} onOpenChange={setOpen}>
          <TooltipTrigger asChild>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="cursor-pointer rounded p-1 text-[#9aa1b0] transition-colors hover:bg-[#f7f8fb] hover:text-[#000000]"
                aria-label="More actions"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenu.Trigger>
          </TooltipTrigger>
          <TooltipContent side="top">More actions</TooltipContent>
          <AnimatePresence>
            {open && (
              <DropdownMenu.Portal forceMount>
                <DropdownMenu.Content asChild sideOffset={8} align="end" className="z-[90]">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="w-[200px] overflow-hidden rounded-[12px] border border-[#e2e5ec] bg-white p-1.5 shadow-lg"
                  >
                    <DropdownMenu.Sub>
                      <DropdownMenu.SubTrigger className={`${itemClass} w-full`}>
                        <FileDown className="h-4 w-4 text-[#666666]" />
                        Quick Export
                        <ChevronRight className="ml-auto h-4 w-4 text-[#9aa1b0]" />
                      </DropdownMenu.SubTrigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.SubContent
                          sideOffset={4}
                          alignOffset={-4}
                          className={subContentClass}
                        >
                          <DropdownMenu.Item
                            className={itemClass}
                            onSelect={() => {
                              onExportExcel();
                              setOpen(false);
                            }}
                          >
                            <FileDown className="h-4 w-4 text-[#666666]" />
                            Excel
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            className={itemClass}
                            onSelect={() => {
                              onExportImage();
                              setOpen(false);
                            }}
                          >
                            <ImageIcon className="h-4 w-4 text-[#666666]" />
                            Image
                          </DropdownMenu.Item>
                        </DropdownMenu.SubContent>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Sub>

                    <DropdownMenu.Item
                      className={`${itemClass} text-[#dc2626] data-[highlighted]:bg-[#fff5f5] data-[highlighted]:text-[#dc2626]`}
                      onSelect={() => {
                        onDelete();
                        setOpen(false);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </DropdownMenu.Item>
                  </motion.div>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            )}
          </AnimatePresence>
        </DropdownMenu.Root>
      </Tooltip>
    </TooltipProvider>
  );
}
