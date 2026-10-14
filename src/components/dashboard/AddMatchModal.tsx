"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CornerDownLeft } from "lucide-react";
import { AppSelect } from "./AppSelect";
import { queue } from "@/components/ui/Toast";

export interface MatchInput {
  name: string;
  map: string;
}

const MAP_OPTIONS = ["Erangel", "Miramar", "Sanhok", "Vikendi", "Livik", "TBD"].map((map) => ({
  label: map,
  value: map,
}));

interface AddMatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddMatch: (match: MatchInput) => void;
  nextMatchNumber?: number;
  showNotification?: boolean;
  mapOptions?: Array<{ label: string; value: string }>;
}

export function AddMatchModal({
  open,
  onOpenChange,
  onAddMatch,
  nextMatchNumber = 1,
  showNotification = true,
  mapOptions = MAP_OPTIONS,
}: AddMatchModalProps) {
  const [name, setName] = useState("");
  const defaultMap = mapOptions[0]?.value || "TBD";
  const [map, setMap] = useState(defaultMap);

  const reset = () => {
    setName("");
    setMap(defaultMap);
  };

  useEffect(() => {
    if (open) reset();
  }, [open, defaultMap]);

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const submit = () => {
    const matchName = name.trim() || `Match ${nextMatchNumber}`;

    onAddMatch({
      name: matchName,
      map: map.trim() || "TBD",
    });

    if (showNotification) {
      queue.add(
        {
          title: "Match added",
          description: `${matchName} has been added successfully.`,
          variant: "success",
        },
        { timeout: 5000 },
      );
    }
    handleClose();
  };

  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        submit();
      } else {
        e.preventDefault();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-[500px] flex-col gap-0 overflow-hidden rounded-[16px] border border-[#e2e5ec] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
        <DialogTitle className="sr-only">Add Match</DialogTitle>

        <div className="flex items-center justify-between border-b border-[#f0f1f3] px-6 py-4">
          <h2 className="text-[18px] font-semibold text-[#000000]">Add Match</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form
            id="add-match-form"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            onKeyDown={handleFormKeyDown}
            className="space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                Match Name <span className="text-[#9aa1b0]">(optional)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Match ${nextMatchNumber}`}
                className="h-[40px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[14px] text-[#000000] outline-none placeholder:text-[#b0b7c4] focus:border-[#000000]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">Map</label>
              <AppSelect value={map} onChange={setMap} options={mapOptions} />
            </div>
          </form>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#f0f1f3] px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            className="cursor-pointer rounded-[8px] border border-[#e2e5ec] px-4 py-2 text-[13px] font-medium text-[#666666] hover:bg-[#f7f8fb]"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-match-form"
            className="flex cursor-pointer items-center gap-2 rounded-[8px] bg-[#000000] px-5 py-2 text-[13px] font-medium text-white hover:bg-[#333]"
          >
            Add Match
            <div className="flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
              Ctrl + <CornerDownLeft className="h-3 w-3" />
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
