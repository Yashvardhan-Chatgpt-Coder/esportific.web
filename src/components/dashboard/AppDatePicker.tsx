"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type AppDatePickerProps = {
  value?: string;
  onChange: (date: string) => void;
  placeholder?: string;
};

export function AppDatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
}: AppDatePickerProps) {
  const [open, setOpen] = useState(false);
  const dateValue = value ? new Date(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full h-[40px] justify-start text-left font-normal border-2 border-[#eef0f4] shadow-none rounded-[8px] px-3 text-[14px] bg-white hover:bg-[#fcfdfd] hover:border-[#eef0f4] hover:text-[#000000] focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#eef0f4] cursor-pointer transition-all duration-200",
            !dateValue && "text-[#9aa1b0] hover:text-[#9aa1b0]"
          )}
        >
          <CalendarIcon className="h-4 w-4 text-[#9aa1b0] mr-2" />
          {dateValue ? format(dateValue, "PP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={(d) => {
            if (d) {
              onChange(d.toISOString());
            }
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
