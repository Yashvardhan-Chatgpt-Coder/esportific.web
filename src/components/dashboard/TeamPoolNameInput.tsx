"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { PoolTeam } from "@/lib/team-pool";
import { cn, optimizeCloudinaryUrl } from "@/lib/utils";

interface TeamPoolNameInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectTeam: (team: PoolTeam) => void;
  poolTeams: PoolTeam[];
  excludeNames?: string[];
  placeholder?: string;
}

function teamInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (parts[0]?.slice(0, 2) || "T").toUpperCase();
}

export function TeamPoolNameInput({
  value,
  onChange,
  onSelectTeam,
  poolTeams,
  excludeNames = [],
  placeholder = "Enter team name",
}: TeamPoolNameInputProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const excludeSet = useMemo(
    () => new Set(excludeNames.map((n) => n.trim().toLowerCase())),
    [excludeNames],
  );

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return poolTeams
      .filter((t) => t.name.toLowerCase().includes(q))
      .filter((t) => !excludeSet.has(t.name.toLowerCase()))
      .slice(0, 8);
  }, [value, poolTeams, excludeSet]);

  useEffect(() => {
    setActiveIndex(0);
  }, [value, suggestions.length]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const pick = (team: PoolTeam) => {
    onSelectTeam(team);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      pick(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showList = open && value.trim().length > 0 && suggestions.length > 0;

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className="h-[40px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[14px] text-[#000000] outline-none placeholder:text-[#b0b7c4] focus:border-[#000000]"
      />

      {showList && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-[200] max-h-[240px] overflow-y-auto rounded-[8px] border border-[#e2e5ec] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.1)]"
        >
          {suggestions.map((team, index) => (
            <li key={team.id} role="option" aria-selected={index === activeIndex}>
              <HoverCard openDelay={100} closeDelay={150}>
                <HoverCardTrigger asChild>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(team);
                    }}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#f7f8fb]",
                      index === activeIndex && "bg-[#f7f8fb]",
                    )}
                  >
                    <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f0f1f3] text-[12px] font-semibold text-[#4b5563]">
                      {team.logo ? (
                        <img
                          src={optimizeCloudinaryUrl(team.logo, 64, 64)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        team.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-[#000000]">{team.name}</p>
                      {team.tags.length > 0 && (
                        <p className="truncate text-[11px] text-[#9aa1b0]">
                          {team.tags.slice(0, 3).join(" / ")}
                        </p>
                      )}
                    </div>
                  </button>
                </HoverCardTrigger>
                <HoverCardContent side="left" align="start" className="w-80 p-0">
                  <div className="flex gap-3 p-4">
                    <Avatar className="h-12 w-12 border border-[#e2e5ec] bg-[#f0f1f3]">
                      {team.logo && (
                        <AvatarImage
                          src={optimizeCloudinaryUrl(team.logo, 96, 96)}
                          alt={team.name}
                          className="object-cover"
                        />
                      )}
                      <AvatarFallback className="bg-[#f0f1f3] text-[13px] font-semibold text-[#4b5563]">
                        {teamInitials(team.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="min-w-0">
                        <h4 className="truncate text-[14px] font-semibold text-[#000000]">
                          {team.name}
                        </h4>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {team.tags.length > 0 ? (
                            team.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-[4px] bg-[#f0f1f3] px-2 py-0.5 text-[11px] font-medium text-[#4b5563]"
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-[12px] text-[#9aa1b0]">No tags</span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 text-[12px]">
                        <div>
                          <p className="font-medium text-[#4b5563]">Mobile number</p>
                          <p className="mt-0.5 break-words text-[#000000]">
                            {team.contactMobile || "Not added"}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-[#4b5563]">Notes</p>
                          <p className="mt-0.5 line-clamp-4 whitespace-pre-line break-words text-[#000000]">
                            {team.notes || "No notes"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
