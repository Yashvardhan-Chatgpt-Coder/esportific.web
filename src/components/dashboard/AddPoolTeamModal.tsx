"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Upload, CornerDownLeft } from "lucide-react";
import { queue } from "@/components/ui/Toast";
import { PhoneNumberInput } from "@/components/dashboard/PhoneNumberInput";
import { POOL_TEAM_NOTES_MAX_LENGTH, type PoolTeam } from "@/lib/team-pool";
import { AnimatePresence, motion } from "framer-motion";

export type AddPoolTeamInput = {
  name: string;
  logo: string | null;
  tags: string[];
  contactMobile: string;
  notes?: string;
};

type AddPoolTeamModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTeam: (input: AddPoolTeamInput) => void;
};

export function AddPoolTeamModal({ open, onOpenChange, onAddTeam }: AddPoolTeamModalProps) {
  const [name, setName] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [contactMobile, setContactMobile] = useState("");
  const [notes, setNotes] = useState("");
  const tagsContainerRef = useRef<HTMLDivElement>(null);
  const [maxTagChars, setMaxTagChars] = useState(20);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const measure = () => {
      if (!tagsContainerRef.current) return;
      const containerWidth = tagsContainerRef.current.offsetWidth;
      const charBudget = Math.floor((containerWidth - 10) / 6.5);
      setMaxTagChars(Math.max(10, charBudget));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open]);

  const handleClose = () => {
    setName("");
    setLogo(null);
    setTags([]);
    setTagInput("");
    setContactMobile("");
    setNotes("");
    onOpenChange(false);
  };

  const processFile = (file: File) => {
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      queue.add(
        {
          title: "File too large",
          description: "Team logos must be under 2MB to keep loading times fast.",
          variant: "error",
        },
        { timeout: 5000 },
      );
      return;
    }

    if (!file.type.startsWith("image/")) {
      queue.add(
        {
          title: "Invalid file type",
          description: "Please upload an image file (PNG, JPG, WEBP).",
          variant: "error",
        },
        { timeout: 5000 },
      );
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const totalTagChars = tags.join("").length;
  const charsRemaining = maxTagChars - totalTagChars;

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (totalTagChars + tagInput.trim().length > maxTagChars) return;
      if (!tags.includes(tagInput.trim())) setTags([...tags, tagInput.trim()]);
      setTagInput("");
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!name.trim()) {
      queue.add(
        {
          title: "Missing required fields",
          description: "Team Name is a mandatory field.",
          variant: "error",
        },
        { timeout: 5000 },
      );
      return;
    }

    onAddTeam({
      name: name.trim(),
      logo,
      tags,
      contactMobile: contactMobile.trim(),
      notes: notes.trim(),
    });

    queue.add(
      {
        title: "Team added",
        description: `${name.trim()} has been added to your teams pool.`,
        variant: "success",
      },
      { timeout: 5000 },
    );
    handleClose();
  };

  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit(e as unknown as React.FormEvent);
    } else if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <DialogContent
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="fixed flex max-h-[90vh] w-full max-w-[500px] flex-col gap-0 overflow-hidden rounded-[16px] border border-[#e2e5ec] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.12)]"
      >
        <DialogTitle className="sr-only">Add Team to Pool</DialogTitle>

        {/* Drag & Drop Visual Overlay */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] transition-all"
            >
              <div className="flex flex-col items-center gap-4 text-center p-8 rounded-[12px] border-2 border-dashed border-white max-w-[85%] bg-black/40">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white">
                  <Upload className="h-6 w-6 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <p className="text-[15px] font-semibold text-white">Drop to Upload Logo</p>
                  <p className="text-[12px] text-white/70">Support PNG, JPG, WEBP (Max 2MB)</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="border-b border-[#f0f1f3] px-6 py-4">
          <h2 className="text-[18px] font-semibold text-[#000000]">Add Team to Pool</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form
            id="add-pool-team-form"
            onSubmit={handleSubmit}
            onKeyDown={handleFormKeyDown}
            className="space-y-5"
          >
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-dashed border-[#c8cdd5] bg-[#f9fbfc]">
                {logo ? (
                  <img src={logo} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <Upload className="h-5 w-5 text-[#9aa1b0]" />
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer rounded-[6px] border border-[#e2e5ec] bg-white px-3 py-1.5 text-[13px] font-medium text-[#000000] hover:bg-[#f7f8fb]"
                >
                  Upload Logo
                </button>
                <p className="mt-1 text-[12px] text-[#9aa1b0]">
                  Recommended 400x400px. You can also drag & drop anywhere.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                Team Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter team name"
                className="h-[40px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[14px] text-[#000000] outline-none placeholder:text-[#b0b7c4] focus:border-[#000000]"
              />
            </div>

            <div ref={tagsContainerRef}>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[13px] font-medium text-[#4b5563]">Tags</label>
                <span
                  className={`text-[11px] ${totalTagChars + tagInput.length >= maxTagChars ? "text-[#dc2626]" : "text-[#9aa1b0]"}`}
                >
                  {totalTagChars + tagInput.length}/{maxTagChars}
                </span>
              </div>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={charsRemaining <= 0 ? "Limit reached" : "e.g. Pro, Invited"}
                disabled={charsRemaining <= 0}
                className="h-[40px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[14px] text-[#000000] outline-none placeholder:text-[#b0b7c4] focus:border-[#999] disabled:cursor-not-allowed disabled:bg-[#f7f8fb]"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-[4px] bg-[#f0f1f3] px-2 py-0.5 text-[11px] font-medium text-[#000000]"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="cursor-pointer text-[#9aa1b0] hover:text-[#dc2626]"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                Mobile number
              </label>
              <PhoneNumberInput value={contactMobile} onChange={setContactMobile} />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[13px] font-medium text-[#4b5563]">Notes</label>
                <span
                  className={`text-[11px] ${
                    notes.length >= POOL_TEAM_NOTES_MAX_LENGTH ? "text-[#dc2626]" : "text-[#9aa1b0]"
                  }`}
                >
                  {notes.length}/{POOL_TEAM_NOTES_MAX_LENGTH}
                </span>
              </div>
              <textarea
                value={notes}
                onChange={(e) => {
                  if (e.target.value.length <= POOL_TEAM_NOTES_MAX_LENGTH) {
                    setNotes(e.target.value);
                  }
                }}
                placeholder="Organizer notes about this team..."
                rows={4}
                className="w-full resize-none rounded-[8px] border border-[#e2e5ec] bg-white px-3 py-2.5 text-[14px] leading-relaxed text-[#000000] outline-none placeholder:text-[#b0b7c4] focus:border-[#000000]"
              />
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
            form="add-pool-team-form"
            className="flex cursor-pointer items-center gap-2 rounded-[8px] bg-[#000000] px-5 py-2 text-[13px] font-medium text-white hover:bg-[#333]"
          >
            Add Team
            <div className="flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
              Ctrl + <CornerDownLeft className="h-3 w-3" />
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function poolTeamFromInput(input: AddPoolTeamInput): PoolTeam {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: input.name,
    logo: input.logo,
    tags: input.tags,
    contactMobile: input.contactMobile,
    notes: input.notes || "",
    lastUpdatedAt: now,
    matchesPlayed: 0,
    lastEvent: { status: "none" },
    topFraggers: [],
    addedAt: now,
    addedFrom: { type: "pool", label: "Teams pool" },
  };
}
