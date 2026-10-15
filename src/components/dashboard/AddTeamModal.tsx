"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Upload, Plus, Trash2, CornerDownLeft } from "lucide-react";
import { queue } from "@/components/ui/Toast";
import { PhoneNumberInput } from "@/components/dashboard/PhoneNumberInput";
import { TeamPoolNameInput } from "@/components/dashboard/TeamPoolNameInput";
import { teamsApi } from "@/lib/api";
import { apiTeamToPoolTeam, dataUrlToFile, isMongoId, playersFromNames } from "@/lib/mappers";
import type { PoolTeam } from "@/lib/team-pool";
import { AnimatePresence, motion } from "framer-motion";

export interface Team {
  id: string;
  name: string;
  logo: string | null;
  slotNumber: string;
  tags: string[];
  contactMobile?: string;
  addToDatabase: boolean;
  players: string[];
}

interface AddTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTeam: (team: Team) => void | Promise<void>;
  showNotification?: boolean;
  mode?: "event" | "pool";
  poolTeams?: PoolTeam[];
  existingTeamNames?: string[];
  sourceEventId?: string;
  sourceEventName?: string;
}

type PlayerNameInputProps = {
  value: string;
  index: number;
  suggestions: string[];
  selectedPlayers: string[];
  inputRef: (el: HTMLInputElement | null) => void;
  onChange: (value: string) => void;
  onEnterAdd: (event: React.KeyboardEvent<HTMLInputElement>) => void;
};

const EMPTY_POOL_TEAMS: PoolTeam[] = [];

function PlayerNameInput({
  value,
  index,
  suggestions,
  selectedPlayers,
  inputRef,
  onChange,
  onEnterAdd,
}: PlayerNameInputProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  const matches = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return [];

    const selectedSet = new Set(
      selectedPlayers
        .filter((player) => player !== value)
        .map((player) => player.trim().toLowerCase())
        .filter(Boolean),
    );

    return suggestions
      .filter((name) => name.toLowerCase().includes(query))
      .filter((name) => !selectedSet.has(name.toLowerCase()))
      .sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const aStarts = aLower.startsWith(query);
        const bStarts = bLower.startsWith(query);
        if (aStarts !== bStarts) return aStarts ? -1 : 1;
        return a.localeCompare(b);
      })
      .slice(0, 6);
  }, [value, suggestions, selectedPlayers]);

  useEffect(() => {
    setActiveIndex(0);
  }, [value, matches.length]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        rootRef.current &&
        !rootRef.current.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const pick = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  const showList = open && matches.length > 0;

  const updateDropdownRect = () => {
    setDropdownRect(rootRef.current?.getBoundingClientRect() ?? null);
  };

  useEffect(() => {
    if (!showList) return;

    updateDropdownRect();
    window.addEventListener("resize", updateDropdownRect);
    window.addEventListener("scroll", updateDropdownRect, true);
    return () => {
      window.removeEventListener("resize", updateDropdownRect);
      window.removeEventListener("scroll", updateDropdownRect, true);
    };
  }, [showList]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (showList) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % matches.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) => (current - 1 + matches.length) % matches.length);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        pick(matches[activeIndex]);
        return;
      }
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
    }

    onEnterAdd(event);
  };

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          updateDropdownRect();
          setOpen(true);
        }}
        onFocus={() => {
          updateDropdownRect();
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={`Player ${index + 1}`}
        autoComplete="off"
        className="h-[36px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[13px] text-[#000000] outline-none placeholder:text-[#b0b7c4] focus:border-[#999]"
      />

      {showList &&
        dropdownRect &&
        createPortal(
          <ul
            ref={dropdownRef}
            role="listbox"
            className="fixed z-[260] max-h-[180px] overflow-y-auto rounded-[8px] border border-[#e2e5ec] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.1)]"
            style={{
              width: dropdownRect.width,
              left: dropdownRect.left,
              top: dropdownRect.bottom + 4,
            }}
          >
            {matches.map((name, matchIndex) => (
              <li key={name} role="option" aria-selected={matchIndex === activeIndex}>
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    pick(name);
                  }}
                  className={`w-full cursor-pointer truncate px-3 py-2 text-left text-[13px] font-medium transition-colors ${
                    matchIndex === activeIndex
                      ? "bg-[#f7f8fb] text-[#000000]"
                      : "text-[#4b5563] hover:bg-[#f7f8fb] hover:text-[#000000]"
                  }`}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
}

export function AddTeamModal({
  open,
  onOpenChange,
  onAddTeam,
  showNotification = true,
  mode = "event",
  poolTeams: poolTeamsProp = EMPTY_POOL_TEAMS,
  existingTeamNames = [],
  sourceEventId,
  sourceEventName,
}: AddTeamModalProps) {
  const isPoolMode = mode === "pool";
  const [poolTeams, setPoolTeams] = useState<PoolTeam[]>(poolTeamsProp);
  const [poolTeamsLoading, setPoolTeamsLoading] = useState(false);
  const [historicalPlayerNames, setHistoricalPlayerNames] = useState<string[]>([]);
  const [selectedPoolTeamId, setSelectedPoolTeamId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [slotNumber, setSlotNumber] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [contactMobile, setContactMobile] = useState("");
  const [addToDatabase, setAddToDatabase] = useState(false);
  const tagsContainerRef = useRef<HTMLDivElement>(null);
  const [maxTagChars, setMaxTagChars] = useState(20);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Measure available width and calculate max total characters
  useEffect(() => {
    const measure = () => {
      if (!tagsContainerRef.current) return;
      const containerWidth = tagsContainerRef.current.offsetWidth;
      // Each tag pill: ~36px overhead (padding + × button + gap) + ~6.5px per char
      // We estimate a "budget" of characters that fits in one line
      // Subtract some safety margin
      const charBudget = Math.floor((containerWidth - 10) / 6.5);
      setMaxTagChars(Math.max(10, charBudget));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  const [players, setPlayers] = useState<string[]>([""]);
  const playerInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const prevPlayersLength = useRef(players.length);

  useEffect(() => {
    if (players.length > prevPlayersLength.current) {
      const lastInput = playerInputsRef.current[players.length - 1];
      if (lastInput) lastInput.focus();
    }
    prevPlayersLength.current = players.length;
  }, [players.length]);

  useEffect(() => {
    if (poolTeamsProp.length > 0) {
      setPoolTeams(poolTeamsProp);
    }
  }, [poolTeamsProp]);

  useEffect(() => {
    if (!open || isPoolMode) return;

    let cancelled = false;
    setPoolTeamsLoading(true);

    teamsApi
      .getAll()
      .then((teams) => {
        if (!cancelled) setPoolTeams(teams.map(apiTeamToPoolTeam));
      })
      .catch(() => {
        if (!cancelled && poolTeamsProp.length > 0) setPoolTeams(poolTeamsProp);
      })
      .finally(() => {
        if (!cancelled) setPoolTeamsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, isPoolMode, poolTeamsProp]);

  useEffect(() => {
    if (!open || isPoolMode) return;

    let cancelled = false;
    teamsApi
      .getPlayerSuggestions()
      .then((names) => {
        if (!cancelled) setHistoricalPlayerNames(names);
      })
      .catch(() => {
        if (!cancelled) setHistoricalPlayerNames([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open, isPoolMode]);

  const handleNameChange = (value: string) => {
    setName(value);
    setSelectedPoolTeamId(null);
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
    reader.onloadend = () => {
      setLogo(reader.result as string);
    };
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

  const handleClose = () => {
    setName("");
    setLogo(null);
    setSlotNumber("");
    setTags([]);
    setTagInput("");
    setContactMobile("");
    setAddToDatabase(false);
    setSelectedPoolTeamId(null);
    setPlayers([""]);
    onOpenChange(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
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

    setIsSubmitting(true);
    try {
      let teamId = selectedPoolTeamId && isMongoId(selectedPoolTeamId) ? selectedPoolTeamId : null;

      if (addToDatabase && !teamId) {
        const logoFile = logo ? dataUrlToFile(logo) : null;
        const payload = {
          name: name.trim(),
          tags,
          contactMobile: contactMobile.trim(),
          players: playersFromNames(players.filter((p) => p.trim() !== "")),
          logoFile,
          isPoolTeam: true,
          source: sourceEventId || sourceEventName ? ("event" as const) : ("pool" as const),
          sourceEventId,
          sourceEventName,
        };
        const created = logoFile
          ? await teamsApi.createWithLogo(payload)
          : await teamsApi.create(payload);
        teamId = created._id;
      }

      await onAddTeam({
        id: teamId || crypto.randomUUID(),
        name: name.trim(),
        logo,
        slotNumber,
        tags,
        contactMobile: contactMobile.trim(),
        addToDatabase,
        players: players.filter((p) => p.trim() !== ""),
      });

      if (showNotification) {
        queue.add(
          {
            title: "Team added",
            description: `${name.trim()} has been added successfully.`,
            variant: "success",
          },
          { timeout: 5000 },
        );
      }
      handleClose();
    } catch (err) {
      queue.add(
        {
          title: "Could not add team",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "error",
        },
        { timeout: 5000 },
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        handleSubmit(e as unknown as React.FormEvent);
      } else {
        e.preventDefault();
      }
    }
  };

  const addPlayerField = () => setPlayers([...players, ""]);

  const handlePlayerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.ctrlKey) {
      e.preventDefault();
      addPlayerField();
    }
  };

  const updatePlayer = (index: number, value: string) => {
    const newPlayers = [...players];
    newPlayers[index] = value;
    setPlayers(newPlayers);
  };

  const removePlayer = (index: number) => {
    if (players.length > 1) {
      setPlayers(players.filter((_, i) => i !== index));
    }
  };

  const totalTagChars = tags.join("").length;
  const charsRemaining = maxTagChars - totalTagChars;

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (totalTagChars + tagInput.trim().length > maxTagChars) return;
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const hasSelectedPoolTeam = Boolean(selectedPoolTeamId);

  const applyPoolTeam = (team: PoolTeam) => {
    setName(team.name);
    setLogo(team.logo);
    setTags([...team.tags]);
    setContactMobile(team.contactMobile || "");
    setSelectedPoolTeamId(team.id);
    setAddToDatabase(false);
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
        <DialogTitle className="sr-only">
          {isPoolMode ? "Add Team to Pool" : "Add Team"}
        </DialogTitle>

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

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f0f1f3] px-6 py-4">
          <h2 className="text-[18px] font-semibold text-[#000000]">
            {isPoolMode ? "Add Team to Pool" : "Add Team"}
          </h2>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form
            id="add-team-form"
            onSubmit={handleSubmit}
            onKeyDown={handleFormKeyDown}
            className="space-y-5"
          >
            {/* Logo Upload */}
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

            {/* Team Name */}
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                Team Name <span className="text-red-500">*</span>
              </label>
              {isPoolMode ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter team name"
                  className="h-[40px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[14px] text-[#000000] outline-none placeholder:text-[#b0b7c4] focus:border-[#000000]"
                />
              ) : (
                <TeamPoolNameInput
                  value={name}
                  onChange={handleNameChange}
                  onSelectTeam={applyPoolTeam}
                  poolTeams={poolTeams}
                  excludeNames={existingTeamNames}
                  placeholder={poolTeamsLoading ? "Loading teams..." : "Enter team name"}
                />
              )}
            </div>

            {/* Slot Number & Tags */}
            <div className={isPoolMode ? "" : "grid grid-cols-2 gap-4"}>
              {!isPoolMode && (
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                    Slot Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={slotNumber}
                    onChange={(e) => setSlotNumber(e.target.value)}
                    placeholder="e.g. 1"
                    className="h-[40px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[14px] text-[#000000] outline-none placeholder:text-[#b0b7c4] focus:border-[#000000]"
                  />
                </div>
              )}
              <div className="relative" ref={tagsContainerRef}>
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
                  className="h-[40px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[14px] text-[#000000] outline-none placeholder:text-[#b0b7c4] focus:border-[#999] disabled:bg-[#f7f8fb] disabled:cursor-not-allowed"
                />
                <div className="absolute left-0 top-[74px] flex w-full gap-1.5 overflow-hidden max-h-[28px]">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex shrink-0 items-center gap-1 rounded-[4px] bg-[#f0f1f3] px-2 py-0.5 text-[11px] font-medium text-[#000000]"
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
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                Mobile number
              </label>
              <PhoneNumberInput value={contactMobile} onChange={setContactMobile} />
            </div>

            {!isPoolMode && (
              <div className="mt-4">
                <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                  Team Players
                </label>
                <div className="space-y-2">
                  {players.map((player, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <PlayerNameInput
                        value={player}
                        index={index}
                        suggestions={historicalPlayerNames}
                        selectedPlayers={players}
                        inputRef={(el) => {
                          playerInputsRef.current[index] = el;
                        }}
                        onChange={(value) => updatePlayer(index, value)}
                        onEnterAdd={handlePlayerKeyDown}
                      />
                      {players.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePlayer(index)}
                          className="grid h-[36px] w-[36px] cursor-pointer place-items-center rounded-[8px] border border-[#e2e5ec] bg-[#f9fbfc] text-[#9aa1b0] hover:bg-[#fee2e2] hover:text-[#ef4444] hover:border-[#fca5a5]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addPlayerField}
                  className="mt-2 flex cursor-pointer items-center gap-1.5 text-[13px] font-medium text-[#000000] hover:text-[#666666]"
                >
                  <Plus className="h-4 w-4" /> Add another player
                </button>
              </div>
            )}

            <AnimatePresence initial={false}>
              {!isPoolMode && !hasSelectedPoolTeam && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pt-2">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={addToDatabase}
                        onChange={(e) => setAddToDatabase(e.target.checked)}
                        className="h-4 w-4 rounded border-[#e2e5ec] accent-[#000000] text-[#000000] focus:ring-[#000000]"
                      />
                      <span className="text-[14px] font-medium text-[#4b5563]">
                        Save team to database for future events
                      </span>
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>

        {/* Footer */}
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
            form="add-team-form"
            disabled={isSubmitting}
            className="flex cursor-pointer items-center gap-2 rounded-[8px] bg-[#000000] px-5 py-2 text-[13px] font-medium text-white hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Adding…" : "Add Team"}
            <div className="flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
              Ctrl + <CornerDownLeft className="h-3 w-3" />
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
