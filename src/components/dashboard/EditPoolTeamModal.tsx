"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Upload, CornerDownLeft, Trash2 } from "lucide-react";
import { queue } from "@/components/ui/Toast";
import { PhoneNumberInput } from "@/components/dashboard/PhoneNumberInput";
import { POOL_TEAM_NOTES_MAX_LENGTH, type PoolTeam } from "@/lib/team-pool";
import { optimizeCloudinaryUrl } from "@/lib/utils";

type EditPoolTeamModalProps = {
  open: boolean;
  team: PoolTeam | null;
  onOpenChange: (open: boolean) => void;
  onSave: (team: PoolTeam, logoFile?: File | null, removeLogo?: boolean) => Promise<void> | void;
};

export function EditPoolTeamModal({ open, team, onOpenChange, onSave }: EditPoolTeamModalProps) {
  const [name, setName] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contactMobile, setContactMobile] = useState("");
  const [notes, setNotes] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!team) return;
    setName(team.name);
    setLogo(team.logo);
    setLogoFile(null);
    setRemoveLogo(false);
    setContactMobile(team.contactMobile);
    setNotes(team.notes);
  }, [team]);

  const handleClose = () => onOpenChange(false);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      queue.add(
        { title: "Invalid file", description: "Please choose an image file.", variant: "error" },
        { timeout: 4000 },
      );
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      queue.add(
        { title: "File too large", description: "Team logos are capped at 5MB.", variant: "error" },
        { timeout: 4000 },
      );
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogo(reader.result as string);
      setLogoFile(file);
      setRemoveLogo(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!team || saving) return;

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

    setSaving(true);
    try {
      await onSave(
        {
          ...team,
          name: name.trim(),
          logo,
          contactMobile: contactMobile.trim(),
          notes: notes.trim(),
          lastUpdatedAt: new Date().toISOString(),
        },
        logoFile,
        removeLogo,
      );

      queue.add(
        {
          title: "Team updated",
          description: `${name.trim()} has been saved successfully.`,
          variant: "success",
        },
        { timeout: 5000 },
      );
      handleClose();
    } catch {
      // Parent already shows the detailed API error toast.
    } finally {
      setSaving(false);
    }
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
      <DialogContent className="flex max-h-[90vh] w-full max-w-[480px] flex-col gap-0 overflow-hidden rounded-[16px] border border-[#e2e5ec] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
        <DialogTitle className="sr-only">Edit Team</DialogTitle>

        <div className="flex items-center justify-between border-b border-[#f0f1f3] px-6 py-4">
          <h2 className="text-[18px] font-semibold text-[#000000]">Edit Team</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form
            id="edit-pool-team-form"
            onSubmit={handleSubmit}
            onKeyDown={handleFormKeyDown}
            className="space-y-5"
          >
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-dashed border-[#c8cdd5] bg-[#f9fbfc]">
                {logo ? (
                  <img
                    src={optimizeCloudinaryUrl(logo, 128, 128)}
                    alt="Logo"
                    className="h-full w-full object-cover"
                  />
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
                {team?.logo && logo && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogo(null);
                      setLogoFile(null);
                      setRemoveLogo(true);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="ml-2 inline-flex cursor-pointer items-center gap-1 rounded-[6px] border border-[#fecaca] bg-white px-3 py-1.5 text-[13px] font-medium text-[#dc2626] hover:bg-[#fff5f5]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove Logo
                  </button>
                )}
                <p className="mt-1 text-[12px] text-[#9aa1b0]">Recommended 400x400px</p>
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

            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                Contact info — Mobile number
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
            disabled={saving}
            className="cursor-pointer rounded-[8px] border border-[#e2e5ec] px-4 py-2 text-[13px] font-medium text-[#666666] hover:bg-[#f7f8fb]"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-pool-team-form"
            disabled={saving}
            aria-live="polite"
            className="flex min-w-[152px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-[8px] bg-[#000000] px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#333] disabled:cursor-wait disabled:opacity-80"
          >
            <span className="relative h-[18px] w-[100px] shrink-0 overflow-hidden text-center" aria-live="polite">
              <span className={`absolute inset-0 whitespace-nowrap transition-all duration-300 ${saving ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"}`}>
                Save Changes
              </span>
              <span className={`absolute inset-0 whitespace-nowrap transition-all duration-300 ${saving ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}>
                Saving...
              </span>
            </span>
            <div className={`flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60 transition-opacity duration-200 ${saving ? "opacity-0" : "opacity-100"}`}>
              Ctrl + <CornerDownLeft className="h-3 w-3" />
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
