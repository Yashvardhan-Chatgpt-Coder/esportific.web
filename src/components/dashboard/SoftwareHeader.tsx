import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Calculator,
  Crown,
  Plus,
  Search,
  UserPlus,
  Swords,
  Database,
  Sparkles,
  Settings,
  CreditCard,
  BookOpen,
  ArrowUpRight,
  LogOut,
  Users,
} from "lucide-react";
import { ComingSoonDialog } from "./ComingSoonDialog";
import { ThemedConfirmDialog } from "@/components/ui/dialog";
import { AnimatePresence, motion } from "framer-motion";
import { cn, optimizeCloudinaryUrl } from "@/lib/utils";
import { queue } from "@/components/ui/Toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  authApi,
  eventsApi,
  scoringRulesApi,
  teamsApi,
  type ApiEvent,
  type ApiScoringRule,
  type ApiTeam,
} from "@/lib/api";

type SoftwareHeaderProps = {
  title: string;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  /** Hide organizer-only actions (create event, invite, upgrade). */
  variant?: "organizer" | "admin";
};

const GLOBAL_SEARCH_TERMS = ["events", "scoring presets", "teams"];

const textLoopVariants = {
  initial: {
    y: 14,
    opacity: 0,
    filter: "blur(4px)",
  },
  animate: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
  },
  exit: {
    y: -14,
    opacity: 0,
    filter: "blur(4px)",
  },
};

const textLoopTransition = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.8,
} as const;

const CreateEventModal = lazy(() =>
  import("./CreateEventModal").then((module) => ({ default: module.CreateEventModal })),
);
const ProfileSettingsModal = lazy(() =>
  import("./ProfileSettingsModal").then((module) => ({ default: module.ProfileSettingsModal })),
);

type GlobalSearchResult = {
  id: string;
  kind: "event" | "scoring" | "team";
  title: string;
  subtitle: string;
};

function TextLoop({ words, interval = 1650 }: { words: string[]; interval?: number }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (words.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % words.length);
    }, interval);

    return () => window.clearInterval(timer);
  }, [interval, words.length]);

  return (
    <span className="relative inline-grid min-w-[112px] overflow-hidden align-bottom">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={words[index]}
          variants={textLoopVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={textLoopTransition}
          className="col-start-1 row-start-1 whitespace-nowrap"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function SoftwareHeader({
  title,
  searchValue,
  searchPlaceholder = "Search by event or team",
  onSearchChange,
  variant = "organizer",
}: SoftwareHeaderProps) {
  const isAdmin = variant === "admin";
  const navigate = useNavigate();
  const { displayName, initials, avatarUrl } = useCurrentUser();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [inviteComingSoonOpen, setInviteComingSoonOpen] = useState(false);
  const [upgradeComingSoonOpen, setUpgradeComingSoonOpen] = useState(false);
  const [billingComingSoonOpen, setBillingComingSoonOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [scoringRules, setScoringRules] = useState<ApiScoringRule[]>([]);
  const [teams, setTeams] = useState<ApiTeam[]>([]);
  const [searchDataLoaded, setSearchDataLoaded] = useState(false);
  const [searchDataLoading, setSearchDataLoading] = useState(false);
  const [activeSearchResultIndex, setActiveSearchResultIndex] = useState(0);
  const enableGlobalSearch = !isAdmin;
  const searchQuery = enableGlobalSearch ? (searchValue ?? globalSearch) : (searchValue ?? "");
  const trimmedSearchQuery = searchQuery.trim();

  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      title: string;
      description: string;
      time: string;
      type: string;
      unread: boolean;
    }>
  >([]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const loadGlobalSearchData = useCallback(async () => {
    if (!enableGlobalSearch || searchDataLoaded || searchDataLoading) return;
    setSearchDataLoading(true);
    try {
      const [eventRows, scoringRows, teamRows] = await Promise.all([
        eventsApi.getAll(),
        scoringRulesApi.getAll(),
        teamsApi.getAll(),
      ]);
      setEvents(eventRows);
      setScoringRules(scoringRows);
      setTeams(teamRows);
      setSearchDataLoaded(true);
    } catch {
      setEvents([]);
      setScoringRules([]);
      setTeams([]);
    } finally {
      setSearchDataLoading(false);
    }
  }, [enableGlobalSearch, searchDataLoaded, searchDataLoading]);

  const updateSearchQuery = (value: string) => {
    setGlobalSearch(value);
    onSearchChange?.(value);
  };

  const globalSearchResults = useMemo<GlobalSearchResult[]>(() => {
    if (!enableGlobalSearch || !trimmedSearchQuery) return [];

    const query = trimmedSearchQuery.toLowerCase();
    const includesQuery = (...values: Array<string | undefined | null>) =>
      values.some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      );

    const eventResults = events
      .filter((event) => includesQuery(event.name, event.game, event.format, event.status))
      .slice(0, 4)
      .map((event) => ({
        id: event._id,
        kind: "event" as const,
        title: event.name,
        subtitle: `${event.game || "Event"} · ${event.status}`,
      }));

    const scoringResults = scoringRules
      .filter((rule) =>
        includesQuery(
          rule.name,
          rule.description,
          rule.gameName,
          rule.format,
          rule.isPlatform ? "platform" : "custom",
        ),
      )
      .slice(0, 4)
      .map((rule) => ({
        id: rule._id,
        kind: "scoring" as const,
        title: rule.name,
        subtitle: `${rule.gameName || "Generic"} · ${rule.isPlatform ? "Platform preset" : "Custom preset"}`,
      }));

    const teamResults = teams
      .filter((team) =>
        includesQuery(
          team.name,
          team.contactMobile,
          team.notes,
          ...(team.tags || []),
          ...(team.players || []).map((player) => player.name),
        ),
      )
      .slice(0, 4)
      .map((team) => ({
        id: team._id,
        kind: "team" as const,
        title: team.name,
        subtitle: `${team.players?.length || 0} ${team.players?.length === 1 ? "player" : "players"} · Teams pool`,
      }));

    return [...eventResults, ...scoringResults, ...teamResults].slice(0, 9);
  }, [enableGlobalSearch, events, scoringRules, teams, trimmedSearchQuery]);

  const handleSearchResultSelect = (result: GlobalSearchResult) => {
    updateSearchQuery("");
    setSearchFocused(false);
    setActiveSearchResultIndex(0);

    if (result.kind === "event") {
      navigate({ to: "/events/$eventId", params: { eventId: result.id } });
      return;
    }

    if (result.kind === "scoring") {
      navigate({ to: "/scoring-rules", search: { ruleId: result.id } });
      return;
    }

    navigate({ to: "/teams", search: { teamId: result.id } });
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!enableGlobalSearch) return;

    if (event.key === "Escape") {
      event.preventDefault();
      setSearchFocused(false);
      searchInputRef.current?.blur();
      return;
    }

    if (!trimmedSearchQuery || globalSearchResults.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSearchResultIndex((index) => (index + 1) % globalSearchResults.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSearchResultIndex(
        (index) => (index - 1 + globalSearchResults.length) % globalSearchResults.length,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const result = globalSearchResults[activeSearchResultIndex];
      if (result) handleSearchResultSelect(result);
    }
  };

  const toggleRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    queue.add(
      {
        title: "Notifications",
        description: "All notifications marked as read.",
        variant: "success",
      },
      { timeout: 3000 },
    );
  };

  const confirmLogout = () => {
    setLogoutConfirmOpen(false);
    void authApi
      .logout()
      .catch(() => null)
      .finally(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        queue.add(
          {
            title: "Log Out",
            description: "You have been securely signed out.",
            variant: "success",
          },
          { timeout: 3000 },
        );
        navigate({ to: isAdmin ? "/admin/login" : "/login" });
      });
  };

  useEffect(() => {
    if (!notifOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen]);

  useEffect(() => {
    if (!profileOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileOpen]);

  useEffect(() => {
    if (!enableGlobalSearch || !searchFocused) return;
    void loadGlobalSearchData();
  }, [enableGlobalSearch, loadGlobalSearchData, searchFocused]);

  useEffect(() => {
    if (!searchFocused) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchFocused]);

  useEffect(() => {
    setActiveSearchResultIndex(0);
  }, [trimmedSearchQuery]);

  useEffect(() => {
    if (activeSearchResultIndex >= globalSearchResults.length) {
      setActiveSearchResultIndex(0);
    }
  }, [activeSearchResultIndex, globalSearchResults.length]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const isSearchShortcut = event.ctrlKey && event.key.toLowerCase() === "k";
      if (!isSearchShortcut) return;

      event.preventDefault();
      setSearchFocused(true);
      searchInputRef.current?.focus();
      if (enableGlobalSearch) void loadGlobalSearchData();
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [enableGlobalSearch, loadGlobalSearchData]);

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "match":
        return Swords;
      case "registration":
        return UserPlus;
      case "system":
        return Database;
      case "promotion":
        return Sparkles;
      default:
        return Bell;
    }
  };

  const getNotifIconBg = (type: string) => {
    switch (type) {
      case "match":
        return "bg-amber-50 text-amber-600";
      case "registration":
        return "bg-emerald-50 text-emerald-600";
      case "system":
        return "bg-rose-50 text-rose-600";
      case "promotion":
        return "bg-zinc-100 text-zinc-800";
      default:
        return "bg-gray-50 text-[#666666]";
    }
  };

  return (
    <>
      <AnimatePresence>
        {searchFocused && (
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="fixed inset-0 z-20 bg-black/70"
          />
        )}
      </AnimatePresence>

      <header
        className={cn(
          "es-app-header sticky top-0 z-30 flex h-[56px] shrink-0 items-center gap-4 border-b bg-white px-4",
          searchFocused ? "border-transparent" : "border-[#e7e9f0]",
        )}
      >
        <AnimatePresence>
          {searchFocused && (
            <motion.div
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              onMouseDown={() => setSearchFocused(false)}
              className="absolute inset-x-0 -bottom-px top-0 z-10 bg-black/70"
            />
          )}
        </AnimatePresence>
        <div className="w-[310px] shrink-0 px-1 text-[16px] font-medium text-[#4d5568]">{title}</div>

        <div ref={searchRef} className="relative z-20 min-w-0 w-[405px] max-w-[42vw] flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1b0]" />
          <input
            ref={searchInputRef}
            data-no-style
            value={searchQuery}
            onFocus={() => setSearchFocused(true)}
            onChange={(event) => updateSearchQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="h-[36px] w-full rounded-[5px] border-2 border-[#eef0f4] bg-white pl-10 pr-20 text-[14px] outline-none placeholder:text-[#9aa1b0] transition-all duration-200 focus:border-[#eef0f4]"
            placeholder={enableGlobalSearch ? "" : `${searchPlaceholder} (Ctrl K)`}
            aria-label={`${searchPlaceholder}. Press Control K to focus search.`}
            aria-expanded={
              enableGlobalSearch && searchFocused && trimmedSearchQuery ? true : undefined
            }
            aria-activedescendant={
              enableGlobalSearch && globalSearchResults[activeSearchResultIndex]
                ? `global-search-result-${globalSearchResults[activeSearchResultIndex].kind}-${globalSearchResults[activeSearchResultIndex].id}`
                : undefined
            }
            role={enableGlobalSearch ? "combobox" : undefined}
          />
          {enableGlobalSearch && !searchQuery && (
            <>
              <div className="pointer-events-none absolute left-10 top-1/2 flex -translate-y-1/2 items-center text-[14px] text-[#9aa1b0]">
                <span>Search for&nbsp;</span>
                <TextLoop words={GLOBAL_SEARCH_TERMS} />
              </div>
              <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-[5px] border border-[#e2e5ec] bg-[#f7f8fb] px-1.5 py-0.5 text-[10px] font-semibold text-[#8a90a0]">
                <span>Ctrl</span>
                <span>K</span>
              </div>
            </>
          )}

          <AnimatePresence>
            {enableGlobalSearch && searchFocused && trimmedSearchQuery && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="absolute left-0 top-[42px] z-50 w-full overflow-hidden rounded-[12px] border border-[#e2e5ec] bg-white shadow-[0_16px_50px_rgba(0,0,0,0.14)]"
              >
                <div className="border-b border-[#f0f1f3] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#9aa1b0]">
                  Search results
                </div>
                <div className="max-h-[320px] overflow-y-auto p-1.5">
                  {searchDataLoading ? (
                    <div className="px-3 py-5 text-center text-[13px] text-[#9aa1b0]">
                      Searching...
                    </div>
                  ) : globalSearchResults.length > 0 ? (
                    globalSearchResults.map((result, index) => {
                      const Icon =
                        result.kind === "event"
                          ? Swords
                          : result.kind === "scoring"
                            ? Calculator
                            : Users;
                      const label =
                        result.kind === "event"
                          ? "Event"
                          : result.kind === "scoring"
                            ? "Scoring"
                            : "Team";

                      return (
                        <button
                          key={`${result.kind}-${result.id}`}
                          id={`global-search-result-${result.kind}-${result.id}`}
                          type="button"
                          onClick={() => handleSearchResultSelect(result)}
                          role="option"
                          aria-selected={index === activeSearchResultIndex}
                          onMouseEnter={() => setActiveSearchResultIndex(index)}
                          className={cn(
                            "flex w-full cursor-pointer items-center gap-3 rounded-[8px] px-3 py-2.5 text-left transition-colors hover:bg-[#f7f8fb]",
                            index === activeSearchResultIndex && "bg-[#f0f1f3]",
                          )}
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-[#f0f1f3] text-[#4b5563]">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-semibold text-[#000000]">
                              {result.title}
                            </span>
                            <span className="block truncate text-[11px] text-[#666666]">
                              {result.subtitle}
                            </span>
                          </span>
                          <span className="rounded-full bg-[#f0f1f3] px-2 py-0.5 text-[10px] font-semibold text-[#666666]">
                            {label}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-5 text-center">
                      <p className="text-[13px] font-medium text-[#000000]">No results found</p>
                      <p className="mt-0.5 text-[12px] text-[#9aa1b0]">
                        Try an event, scoring preset, or team name.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-4">
          {!isAdmin && (
            <>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="flex h-[34px] shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-[8px] bg-black px-3 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-zinc-950"
              >
                <Plus className="h-4 w-4" />
                Create Event
              </button>
              <button
                onClick={() => setInviteComingSoonOpen(true)}
                className="flex h-[34px] shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[14px] font-medium text-[#000000] hover:bg-[#f7f8fb]"
              >
                <UserPlus className="h-4 w-4" />
                Invite team
              </button>
              <button
                onClick={() => setUpgradeComingSoonOpen(true)}
                className="flex h-[34px] shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[14px] font-medium text-[#000000] hover:bg-[#f7f8fb]"
              >
                <Crown className="h-4 w-4 text-[#d49b00]" />
                Upgrade
              </button>
            </>
          )}

          <div className="es-app-header-separator h-7 w-px bg-[#edf0f4]" />
          <div className="relative" ref={dropdownRef}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setNotifOpen(!notifOpen)}
                    className={cn(
                      "relative grid h-[34px] w-[34px] cursor-pointer place-items-center rounded-[5px] text-[#303646] transition-colors hover:bg-[#f7f8fb] hover:text-[#000000]",
                      notifOpen && "bg-[#f7f8fb] text-[#000000]",
                    )}
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#dc2626] text-[9px] font-bold text-white ring-2 ring-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Notifications</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Notification Dropdown Panel */}
            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 top-[40px] z-50 flex w-[360px] flex-col rounded-[12px] border border-[#e2e5ec] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)] overflow-hidden"
                >
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between border-b border-[#f0f1f3] px-4 py-3">
                    <span className="text-[14px] font-semibold text-[#000000]">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="cursor-pointer text-[12px] font-semibold text-[#000000] hover:text-[#444444] hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  {/* Notification List Content */}
                  <div className="max-h-[320px] overflow-y-auto divide-y divide-[#f0f1f3]">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                        <Bell className="h-8 w-8 text-[#9aa1b0] mb-2" />
                        <p className="text-[13px] font-medium text-[#000000]">All caught up!</p>
                        <p className="text-[11px] text-[#9aa1b0] mt-0.5">
                          No new notifications at this time.
                        </p>
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const Icon = getNotifIcon(notif.type);
                        const iconBg = getNotifIconBg(notif.type);

                        return (
                          <div
                            key={notif.id}
                            onClick={() => toggleRead(notif.id)}
                            className={cn(
                              "flex gap-3 p-4 cursor-pointer transition-colors hover:bg-[#f9fbfc]",
                              notif.unread && "bg-[#f8fafc]/60",
                            )}
                          >
                            <div
                              className={cn(
                                "grid h-8 w-8 shrink-0 place-items-center rounded-full",
                                iconBg,
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 space-y-0.5 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p
                                  className={cn(
                                    "text-[13px] font-semibold truncate leading-none",
                                    notif.unread ? "text-[#000000]" : "text-[#4b5563]",
                                  )}
                                >
                                  {notif.title}
                                </p>
                                <span className="text-[10px] text-[#9aa1b0] shrink-0 whitespace-nowrap">
                                  {notif.time}
                                </span>
                              </div>
                              <p className="text-[11px] leading-relaxed text-[#666666] break-words">
                                {notif.description}
                              </p>
                            </div>
                            {notif.unread && (
                              <div className="h-2 w-2 rounded-full bg-black mt-1.5 shrink-0" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="relative" ref={profileDropdownRef}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className={cn(
                      "grid h-8 w-8 cursor-pointer place-items-center overflow-hidden rounded-full border border-[#e2e5ec] bg-[#e8eef7] text-[13px] font-semibold text-[#666666] outline-none transition-all duration-200 active:scale-95 hover:border-[#9aa1b0]",
                      profileOpen && "border-[#000000] ring-2 ring-[#e8eef7]",
                    )}
                  >
                    {!isAdmin && avatarUrl ? (
                      <img
                        src={optimizeCloudinaryUrl(avatarUrl, 80, 80)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : isAdmin ? (
                      "AD"
                    ) : (
                      initials
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {isAdmin ? "Admin profile" : "Profile"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Profile Dropdown Panel */}
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 top-[40px] z-50 flex w-[240px] flex-col rounded-[12px] border border-[#e2e5ec] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)] overflow-hidden"
                >
                  {/* User Profile Info Card */}
                  <div className="flex flex-col border-b border-[#f0f1f3] px-4 py-3 bg-[#f9fbfc]">
                    <span className="text-[13px] font-bold text-[#000000] truncate">
                      {isAdmin ? "Admin Dashboard" : displayName}
                    </span>
                  </div>

                  {/* Menu Items */}
                  <div className="flex flex-col p-1">
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        setProfileModalOpen(true);
                      }}
                      className="flex cursor-pointer items-center gap-2.5 rounded-[6px] px-3 py-2 text-left text-[12px] font-medium text-[#4b5563] transition-colors hover:bg-[#f7f8fb] hover:text-[#000000]"
                    >
                      <Settings className="h-4 w-4 shrink-0 text-[#9aa1b0]" />
                      Settings
                    </button>

                    {!isAdmin && (
                      <>
                        <button
                          onClick={() => {
                            setProfileOpen(false);
                            setBillingComingSoonOpen(true);
                          }}
                          className="flex cursor-pointer items-center gap-2.5 rounded-[6px] px-3 py-2 text-left text-[12px] font-medium text-[#4b5563] transition-colors hover:bg-[#f7f8fb] hover:text-[#000000]"
                        >
                          <CreditCard className="h-4 w-4 shrink-0 text-[#9aa1b0]" />
                          Billing & subscription
                        </button>
                      </>
                    )}
                  </div>

                  <div className="h-px bg-[#f0f1f3] mx-1" />

                  <div className="flex flex-col p-1">
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        queue.add(
                          {
                            title: "Documentation",
                            description: "Documentation is coming soon.",
                            variant: "normal",
                          },
                          { timeout: 3000 },
                        );
                      }}
                      className="flex cursor-pointer items-center gap-2.5 rounded-[6px] px-3 py-2 text-left text-[12px] font-medium text-[#4b5563] transition-colors hover:bg-[#f7f8fb] hover:text-[#000000]"
                    >
                      <BookOpen className="h-4 w-4 shrink-0 text-[#9aa1b0]" />
                      <span>Documentation</span>
                      <ArrowUpRight className="ml-auto h-3.5 w-3.5 shrink-0 text-[#9aa1b0]" />
                    </button>
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        setLogoutConfirmOpen(true);
                      }}
                      className="flex cursor-pointer items-center gap-2.5 rounded-[6px] px-3 py-2 text-left text-[12px] font-semibold text-[#dc2626] transition-colors hover:bg-rose-50 hover:text-[#dc2626]"
                    >
                      <LogOut className="h-4 w-4 shrink-0 text-[#fca5a5]" />
                      Log out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {!isAdmin && createModalOpen && (
        <Suspense fallback={null}>
          <CreateEventModal open onOpenChange={setCreateModalOpen} />
        </Suspense>
      )}
      {!isAdmin && (
        <ComingSoonDialog
          open={inviteComingSoonOpen}
          onOpenChange={setInviteComingSoonOpen}
          icon={<UserPlus className="h-5 w-5" />}
        />
      )}
      {!isAdmin && (
        <ComingSoonDialog
          open={upgradeComingSoonOpen}
          onOpenChange={setUpgradeComingSoonOpen}
          icon={<Crown className="h-5 w-5 text-[#d49b00]" />}
        />
      )}
      {!isAdmin && (
        <ComingSoonDialog
          open={billingComingSoonOpen}
          onOpenChange={setBillingComingSoonOpen}
          icon={<CreditCard className="h-5 w-5" />}
        />
      )}
      {profileModalOpen && (
        <Suspense fallback={null}>
          <ProfileSettingsModal open onOpenChange={setProfileModalOpen} isAdmin={isAdmin} />
        </Suspense>
      )}
      <ThemedConfirmDialog
        open={logoutConfirmOpen}
        onOpenChange={setLogoutConfirmOpen}
        title="Log out?"
        description="You will be signed out of this workspace and returned to the login screen."
        cancelLabel="Stay logged in"
        confirmLabel="Log out"
        onConfirm={confirmLogout}
      />
    </>
  );
}
