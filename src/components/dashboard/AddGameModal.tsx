"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CornerDownLeft, Plus, X } from "lucide-react";
import { queue } from "@/components/ui/Toast";
import type { CatalogGame } from "@/lib/games-catalog";

type AddGameModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (game: CatalogGame) => Promise<void> | void;
  initial?: CatalogGame | null;
};

function TagListInput({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");

  const addItem = () => {
    const value = input.trim();
    if (!value || items.includes(value)) return;
    onChange([...items, value]);
    setInput("");
  };

  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder={placeholder}
          className="h-[40px] flex-1 rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[14px] outline-none placeholder:text-[#b0b7c4] focus:border-[#000000]"
        />
        <button
          type="button"
          onClick={addItem}
          className="grid h-[40px] w-[40px] cursor-pointer place-items-center rounded-[8px] border border-[#e2e5ec] bg-[#f9fbfc] hover:bg-[#f0f1f3]"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {items.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item}
              className="flex items-center gap-1 rounded-[4px] bg-[#f0f1f3] px-2 py-0.5 text-[12px] font-medium text-[#000000]"
            >
              {item}
              <button
                type="button"
                onClick={() => onChange(items.filter((i) => i !== item))}
                className="cursor-pointer text-[#9aa1b0] hover:text-[#dc2626]"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function AddGameModal({ open, onOpenChange, onSave, initial }: AddGameModalProps) {
  const [maps, setMaps] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const resetForm = (game?: CatalogGame | null) => {
    setMaps(game?.maps ? [...game.maps] : []);
  };

  const handleOpenChange = (next: boolean) => {
    if (next) resetForm(initial);
    else onOpenChange(false);
  };

  const handleClose = () => onOpenChange(false);

  useEffect(() => {
    if (!open) return;
    resetForm(initial);
  }, [open, initial?.id]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (saving) return;
    if (!initial) {
      queue.add(
        {
          title: "Game not found",
          description: "Maps can only be edited for code-managed games.",
          variant: "error",
        },
        { timeout: 5000 },
      );
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...initial,
        maps,
        updatedAt: new Date().toISOString(),
      });
      handleClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-[500px] flex-col gap-0 overflow-hidden rounded-[16px] border border-[#e2e5ec] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
        <DialogTitle className="sr-only">Edit game maps</DialogTitle>

        <div className="border-b border-[#f0f1f3] px-6 py-4">
          <h2 className="text-[18px] font-semibold text-[#000000]">Edit maps</h2>
          <p className="mt-1 text-[13px] text-[#666666]">
            {initial?.name || "Game"} is code-managed. Only maps can be changed here.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form id="add-game-form" onSubmit={handleSubmit} className="space-y-5">
            <TagListInput
              label="Game maps"
              items={maps}
              onChange={setMaps}
              placeholder="Add a map and press Enter"
            />

            <div className="rounded-[10px] border border-[#e2e5ec] bg-[#f9fbfc] p-3">
              <p className="text-[13px] font-semibold text-[#000000]">Formats are managed from code</p>
              <p className="mt-1 text-[12px] leading-5 text-[#666666]">
                BGMI/PUBG gets Battle Royale and TDM. Free Fire gets Battle Royale and Clash Squad.
              </p>
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
            form="add-game-form"
            disabled={saving}
            className="flex cursor-pointer items-center gap-2 rounded-[8px] bg-[#000000] px-5 py-2 text-[13px] font-medium text-white hover:bg-[#333]"
          >
            {saving ? "Saving..." : "Save maps"}
            <div className="flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
              Ctrl + <CornerDownLeft className="h-3 w-3" />
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
