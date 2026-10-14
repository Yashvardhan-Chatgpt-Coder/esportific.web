import { pageMeta } from "@/lib/route-meta";
"use client";

import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { 
  Bell, 
  ChevronDown, 
  Plus, 
  Search, 
  UserPlus, 
  LayoutDashboard, 
  Users, 
  Swords, 
  Trophy, 
  Settings, 
  ArrowLeft,
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  MoreVertical,
  Download,
  Upload,
  X,
  Lock,
  RefreshCw,
  FileDown,
  GripVertical,
  Bot
} from "lucide-react";
import { SoftwareHeader } from "@/components/dashboard/SoftwareHeader";
import { GameLabel } from "@/components/dashboard/GameLabel";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Popover from "@radix-ui/react-popover";
import { Command } from "cmdk";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover as ShadPopover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/assets")({
  head: () => pageMeta('Assets', 'Browse Esportific design system components and assets.'),
  beforeLoad: () => {
    throw redirect({ to: "/admin/assets" });
  },
});

// Custom Dropdown Item Component to keep things clean
const CustomDropdownItem = ({ children, startContent, isDanger, onClick }: any) => {
  return (
    <DropdownMenu.Item 
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-3 rounded-[8px] px-3 py-2 text-[14px] font-medium outline-none transition-colors data-[highlighted]:bg-[#f7f8fb] ${isDanger ? 'text-[#dc2626] data-[highlighted]:bg-[#fff5f5]' : 'text-[#4b5563] data-[highlighted]:text-[#000000]'}`}
    >
      {startContent && <span className={`flex items-center justify-center ${isDanger ? 'text-[#dc2626]' : 'text-[#666666]'}`}>{startContent}</span>}
      {children}
    </DropdownMenu.Item>
  );
};

// Searchable Dropdown Component
const SearchableDropdown = ({ options, placeholder, label }: any) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");

  return (
    <div className="space-y-1.5 w-full max-w-[300px]">
      {label && <label className="text-[13px] font-medium text-[#4b5563]">{label}</label>}
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button 
            className="h-[40px] w-full cursor-pointer flex items-center justify-between rounded-[8px] border-2 border-[#eef0f4] bg-white px-3 text-[14px] font-normal text-[#000000] outline-none transition-all duration-200 hover:bg-[#fcfdfd]"
          >
            <span className={selected ? "text-[#000000]" : "text-[#9aa1b0]"}>
              {selected ? options.find((o: any) => o.value === selected)?.label : placeholder}
            </span>
            <ChevronDown className={`h-4 w-4 text-[#9aa1b0] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>
        </Popover.Trigger>
        <AnimatePresence>
          {open && (
            <Popover.Portal forceMount>
              <Popover.Content align="start" sideOffset={8} asChild className="z-50">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="w-[300px] overflow-hidden rounded-[12px] border border-[#e2e5ec] bg-white shadow-lg"
                >
                  <Command label="Search options" className="flex flex-col h-full">
                    <div className="flex items-center px-3">
                      <Search className="h-4 w-4 text-[#9aa1b0] mr-2" />
                      <Command.Input 
                        placeholder="Search..."
                        className="h-[44px] w-full border-none bg-transparent text-[14px] text-[#000000] outline-none placeholder:text-[#9aa1b0]"
                      />
                    </div>
                    <Command.List className="max-h-[240px] overflow-y-auto p-1.5 scrollbar-hide">
                      <Command.Empty className="py-6 text-center text-[13px] text-[#9aa1b0]">
                        No results found.
                      </Command.Empty>
                      {options.map((option: any) => (
                        <Command.Item
                          key={option.value}
                          value={option.label}
                          onSelect={() => {
                            setSelected(option.value);
                            setOpen(false);
                          }}
                          className="flex cursor-pointer items-center justify-between rounded-[8px] px-3 py-2 text-[14px] font-medium text-[#4b5563] outline-none transition-colors data-[selected=true]:bg-[#f0f1f3] data-[selected=true]:text-[#000000]"
                        >
                          <div className="flex items-center gap-3">
                            {option.icon}
                            {option.label}
                          </div>
                          {selected === option.value && <CheckCircle2 className="h-4 w-4 text-[#000000]" />}
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
};

// Date Picker using shadcn Popover + Calendar
const CustomDatePicker = ({ label }: { label: string }) => {
  const [date, setDate] = useState<Date>();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-1.5 w-full max-w-[300px]">
      {label && <label className="text-[13px] font-medium text-[#4b5563]">{label}</label>}
      <ShadPopover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            data-empty={!date}
            className="w-full h-[40px] justify-start text-left font-normal border-2 border-[#eef0f4] shadow-none rounded-[8px] px-3 text-[14px] bg-white hover:bg-[#fcfdfd] hover:border-[#eef0f4] hover:text-[#000000] focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#eef0f4] data-[empty=true]:text-[#9aa1b0] data-[empty=true]:hover:text-[#9aa1b0] text-[#000000] cursor-pointer transition-all duration-200"
          >
            <CalendarIcon className="h-4 w-4 text-[#9aa1b0] mr-2" />
            {date ? format(date, "PP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              setDate(d);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </ShadPopover>
    </div>
  );
};

// Reusable Animated Dropdown Wrapper for smooth open/close
const AnimatedDropdown = ({ trigger, children, className, align = "start" }: any) => {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        {trigger}
      </DropdownMenu.Trigger>
      <AnimatePresence>
        {open && (
          <DropdownMenu.Portal forceMount>
            <DropdownMenu.Content asChild sideOffset={8} align={align} className={`z-50 ${className || ''}`}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="overflow-hidden rounded-[12px] border border-[#e2e5ec] bg-white p-1.5 shadow-lg"
              >
                {children}
              </motion.div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        )}
      </AnimatePresence>
    </DropdownMenu.Root>
  );
};

export function AssetsDesignSystemContent() {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto p-8 lg:p-12">
      <div className="mx-auto max-w-[1200px] space-y-16 pb-20">
        {/* Header Section */}
        <header>
          <h1 className="text-[32px] font-bold tracking-tight text-[#000000]">Design System</h1>
          <p className="mt-2 text-[16px] text-[#666666] max-w-[600px]">
            A comprehensive guide to the visual elements, components, and patterns used across the Rangrove Esports tournament management platform.
          </p>
        </header>

        {/* Buttons */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-[#000000] rounded-full" />
            <h2 className="text-[20px] font-semibold text-[#000000]">Buttons</h2>
          </div>
          <div className="rounded-[12px] border border-[#e2e5ec] bg-white p-8 shadow-sm">
            <div className="flex flex-wrap gap-6">
              <div className="space-y-3">
                <p className="text-[12px] font-medium text-[#9aa1b0]">Primary</p>
                <button className="flex h-[38px] cursor-pointer items-center gap-2 rounded-[6px] bg-[#000000] px-5 text-[14px] font-medium text-white transition-colors hover:bg-[#333]">
                  <Plus className="h-4 w-4" />
                  Create Event
                </button>
              </div>
              <div className="space-y-3">
                <p className="text-[12px] font-medium text-[#9aa1b0]">Secondary</p>
                <button className="flex h-[38px] cursor-pointer items-center gap-2 rounded-[6px] border border-[#e2e5ec] bg-white px-5 text-[14px] font-medium text-[#000000] transition-colors hover:bg-[#f7f8fb]">
                  <Search className="h-4 w-4" />
                  Find Match
                </button>
              </div>
              <div className="space-y-3">
                <p className="text-[12px] font-medium text-[#9aa1b0]">Outline Small</p>
                <button className="flex h-[32px] cursor-pointer items-center gap-1.5 rounded-[5px] border border-[#e2e5ec] bg-white px-3 text-[13px] font-medium text-[#666666] transition-colors hover:bg-[#f7f8fb] hover:text-[#000000]">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
              </div>
              <div className="space-y-3">
                <p className="text-[12px] font-medium text-[#9aa1b0]">Icon Button</p>
                <button className="grid h-[36px] w-[36px] cursor-pointer place-items-center rounded-[6px] border border-[#e2e5ec] bg-white text-[#666666] transition-colors hover:bg-[#f7f8fb] hover:text-[#000000]">
                  <Bell className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <p className="text-[12px] font-medium text-[#9aa1b0]">Danger</p>
                <button className="flex h-[38px] cursor-pointer items-center gap-2 rounded-[6px] bg-[#dc2626] px-5 text-[14px] font-medium text-white transition-colors hover:bg-[#b91c1c]">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Form Elements */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-[#000000] rounded-full" />
            <h2 className="text-[20px] font-semibold text-[#000000]">Form Elements</h2>
          </div>
          <div className="rounded-[12px] border border-[#e2e5ec] bg-white p-8 max-w-[600px] space-y-6">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[#4b5563]">Input Field</label>
              <input 
                type="text" 
                placeholder="Enter event name..." 
                className="h-[40px] w-full rounded-[8px] border-2 border-[#eef0f4] bg-white px-3 text-[14px] text-[#000000] outline-none transition-all duration-200 focus:border-[#000000]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[#4b5563]">HeroUI Dropdown (Select Style)</label>
              <AnimatedDropdown 
                className="w-[280px]"
                trigger={
                  <button 
                    aria-label="Select Option" 
                    className="h-[40px] w-full cursor-pointer flex items-center justify-between rounded-[8px] border-2 border-[#eef0f4] bg-white px-3 text-[14px] font-normal text-[#9aa1b0] outline-none transition-all duration-200 hover:bg-[#fcfdfd]"
                  >
                    Select Option <ChevronDown className="h-4 w-4 text-[#9aa1b0]" />
                  </button>
                }
              >
                <CustomDropdownItem startContent={<Plus className="h-4 w-4" />}>
                  New file
                </CustomDropdownItem>
                <CustomDropdownItem startContent={<Download className="h-4 w-4" />}>
                  Copy link
                </CustomDropdownItem>
                <CustomDropdownItem startContent={<Pencil className="h-4 w-4" />}>
                  Edit file
                </CustomDropdownItem>
                
                <DropdownMenu.Separator className="my-1 h-px bg-[#eef0f4]" />
                
                <CustomDropdownItem isDanger startContent={<Trash2 className="h-4 w-4" />}>
                  Delete file
                </CustomDropdownItem>
              </AnimatedDropdown>
            </div>

            <SearchableDropdown 
              label="Search Based Dropdown (Autocomplete)"
              placeholder="Search for a team..."
              options={[
                { label: "Sentinels", value: "sen", icon: <Bot className="h-4 w-4" /> },
                { label: "Paper Rex", value: "prx", icon: <Bot className="h-4 w-4" /> },
                { label: "LOUD", value: "loud", icon: <Bot className="h-4 w-4" /> },
                { label: "Fnatic", value: "fnc", icon: <Bot className="h-4 w-4" /> },
                { label: "Team Liquid", value: "tl", icon: <Bot className="h-4 w-4" /> },
              ]}
            />
            <CustomDatePicker label="Date Picker (Premium)" />
          </div>
        </section>

        {/* Cards */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-[#000000] rounded-full" />
            <h2 className="text-[20px] font-semibold text-[#000000]">Cards & Containers</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Info Card */}
            <div className="rounded-[10px] border border-[#e2e5ec] bg-white overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#f0f1f3] px-6 py-4">
                <h3 className="text-[16px] font-semibold text-[#000000]">Event Options</h3>
                <button className="flex items-center gap-1.5 rounded-[6px] border border-[#e2e5ec] px-3 py-1.5 text-[13px] font-medium text-[#000000] transition-colors hover:bg-[#f7f8fb]">
                  <Pencil className="h-4 w-4" /> Edit
                </button>
              </div>
              <div className="p-6 grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#9aa1b0]">Game</p>
                  <p className="mt-1 text-[14px] font-medium text-[#000000]">
                    <GameLabel name="BGMI" iconClassName="h-5 w-16" />
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#9aa1b0]">Mode</p>
                  <p className="mt-1 text-[14px] font-medium text-[#000000]">Battle Royale</p>
                </div>
              </div>
            </div>

            {/* Status Card */}
            <div className="rounded-[10px] border border-[#e2e5ec] bg-white p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-semibold text-[#000000]">Match Status</h3>
                <span className="rounded-full bg-[#e2f5ec] px-2.5 py-1 text-[11px] font-medium text-[#059669]">Completed</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#666666]">Map</span>
                  <span className="font-medium text-[#000000]">Erangel</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#666666]">Duration</span>
                  <span className="font-medium text-[#000000]">28m 45s</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Badges */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-[#000000] rounded-full" />
            <h2 className="text-[20px] font-semibold text-[#000000]">Status Badges</h2>
          </div>
          <div className="rounded-[12px] border border-[#e2e5ec] bg-white p-8">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-1.5 rounded-full bg-[#000000] px-3 py-1 text-[12px] font-medium text-white">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white"></span>
                </span>
                Live Now
              </div>
              <div className="rounded-full border border-[#e2e5ec] bg-white px-3 py-1 text-[12px] font-medium text-[#000000]">Upcoming</div>
              <div className="rounded-full bg-[#f0f1f3] px-3 py-1 text-[12px] font-medium text-[#666666]">Draft</div>
              <div className="rounded-full bg-[#e2f5ec] px-3 py-1 text-[12px] font-medium text-[#059669]">Success</div>
              <div className="rounded-full bg-[#fee2e2] px-3 py-1 text-[12px] font-medium text-[#dc2626]">Danger</div>
            </div>
          </div>
        </section>

        {/* Dropdowns */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-[#000000] rounded-full" />
            <h2 className="text-[20px] font-semibold text-[#000000]">Dropdowns (Radix UI)</h2>
          </div>
          <div className="rounded-[12px] border border-[#e2e5ec] bg-white p-8">
            <div className="flex flex-wrap gap-8">
              <div className="space-y-3">
                <p className="text-[12px] font-medium text-[#9aa1b0]">Standard Dropdown</p>
                <AnimatedDropdown 
                  className="w-[220px]"
                  trigger={
                    <button className="flex h-[38px] cursor-pointer items-center gap-2 rounded-[6px] border border-[#e2e5ec] bg-white px-5 text-[14px] font-medium text-[#000000] outline-none transition-colors hover:bg-[#f7f8fb] data-[state=open]:bg-[#f0f1f3]">
                      Manage Match <ChevronDown className="h-4 w-4" />
                    </button>
                  }
                >
                  <CustomDropdownItem startContent={<Pencil className="h-4 w-4" />}>
                    Edit Results
                  </CustomDropdownItem>
                  <CustomDropdownItem startContent={<Download className="h-4 w-4" />}>
                    Export Stats
                  </CustomDropdownItem>
                  <DropdownMenu.Separator className="my-1.5 h-px bg-[#f0f1f3]" />
                  <CustomDropdownItem isDanger startContent={<Trash2 className="h-4 w-4" />}>
                    Delete Match
                  </CustomDropdownItem>
                </AnimatedDropdown>
              </div>

              <div className="space-y-3">
                <p className="text-[12px] font-medium text-[#9aa1b0]">Icon Trigger</p>
                <AnimatedDropdown 
                  className="w-[200px]"
                  trigger={
                    <button className="grid h-[36px] w-[36px] cursor-pointer place-items-center rounded-[6px] border border-[#e2e5ec] bg-white text-[#666666] outline-none transition-colors hover:bg-[#f7f8fb] data-[state=open]:bg-[#f0f1f3] data-[state=open]:text-[#000000]">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  }
                >
                  <CustomDropdownItem startContent={<RefreshCw className="h-4 w-4" />}>
                    Refresh Data
                  </CustomDropdownItem>
                  <CustomDropdownItem startContent={<Settings className="h-4 w-4" />}>
                    Event Settings
                  </CustomDropdownItem>
                </AnimatedDropdown>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function AssetsPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fb] text-[#000000]">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <SoftwareHeader title="Design System & Assets" />
        <AssetsDesignSystemContent />
      </div>
    </div>
  );
}
