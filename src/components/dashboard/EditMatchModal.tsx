"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CornerDownLeft } from "lucide-react";
import { AppSelect } from "./AppSelect";
import { queue } from "@/components/ui/Toast";

export interface EditableMatch {
  id: number | string;
  name: string;
  map: string;
  status: "Pending Results" | "Completed";
}

const MAP_OPTIONS = ["Erangel", "Miramar", "Sanhok", "Vikendi", "Livik", "TBD"].map((map) => ({
  label: map,
  value: map,
}));

interface EditMatchModalProps {
  open: boolean;
  match: EditableMatch | null;
  onOpenChange: (open: boolean) => void;
  onSave: (match: EditableMatch) => void;
  mapOptions?: Array<{ label: string; value: string }>;
}

export function EditMatchModal({ open, match, onOpenChange, onSave, mapOptions = MAP_OPTIONS }: EditMatchModalProps) {
  const [name, setName] = useState("");
  const [map, setMap] = useState("Erangel");

  useEffect(() => {
    if (!match || !open) return;
    setName(match.name);
    setMap(match.map);
  }, [match, open]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const submit = () => {
    if (!match) return;

    if (!name.trim()) {
      queue.add(
        {
          title: "Missing required fields",
          description: "Match Name is a mandatory field.",
          variant: "error",
        },
        { timeout: 5000 },
      );
      return;
    }

    onSave({
      ...match,
      name: name.trim(),
      map: map.trim() || "TBD",
      status: match.status,
    });

    queue.add(
      {
        title: "Match updated",
        description: `${name.trim()} has been saved successfully.`,
        variant: "success",
      },
      { timeout: 5000 },
    );
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
        <DialogTitle className="sr-only">Edit Match</DialogTitle>

        <div className="flex items-center justify-between border-b border-[#f0f1f3] px-6 py-4">
          <h2 className="text-[18px] font-semibold text-[#000000]">Edit Match</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form
            id="edit-match-form"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            onKeyDown={handleFormKeyDown}
            className="space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                Match Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter match name"
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
            form="edit-match-form"
            className="flex cursor-pointer items-center gap-2 rounded-[8px] bg-[#000000] px-5 py-2 text-[13px] font-medium text-white hover:bg-[#333]"
          >
            Save Changes
            <div className="flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
              Ctrl + <CornerDownLeft className="h-3 w-3" />
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
