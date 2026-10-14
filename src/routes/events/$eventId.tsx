import { pageMeta } from "@/lib/route-meta";
// Triggering router generation
import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
  lazy,
  Suspense,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog, DialogContent, DialogTitle, ThemedConfirmDialog } from "@/components/ui/dialog";
import { AppSelect } from "@/components/dashboard/AppSelect";
import { AppSearchSelect } from "@/components/dashboard/AppSearchSelect";
import { AppDatePicker } from "@/components/dashboard/AppDatePicker";
import { AppDropdownMenu } from "@/components/dashboard/AppDropdownMenu";
import { AppPopupWindow } from "@/components/dashboard/AppPopupWindow";
import {
  ArrowLeft,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Circle,
  CornerDownLeft,
  Download,
  FileDown,
  FileSpreadsheet,
  GripVertical,
  Headset,
  History,
  Image as ImageIcon,
  Import,
  LayoutDashboard,
  Lock,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Trophy,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import type { Team } from "@/components/dashboard/AddTeamModal";
import { AddMatchModal, type MatchInput } from "@/components/dashboard/AddMatchModal";
import { BulkAddMatchesModal } from "@/components/dashboard/BulkAddMatchesModal";
import { EditMatchModal, type EditableMatch } from "@/components/dashboard/EditMatchModal";
import { MatchCardMenu } from "@/components/dashboard/MatchCardMenu";
import { MatchResultsModal } from "@/components/dashboard/MatchResultsModal";
import {
  VIEW_MATCH_RESULTS_CLOSE_MS,
  ViewMatchResultsModal,
  type ResultEditContext,
} from "@/components/dashboard/ViewMatchResultsModal";
import { type ResultEntry, type TeamData } from "@/components/dashboard/AddResultModal";
import { exportMatchResultsToExcel } from "@/lib/match-results-export";
import { exportMatchResultsPlainImage } from "@/lib/match-results-export";

import {
  buildMatchResultRows,
  DEFAULT_MATCH_SCORING,
  type EventScoringRules,
} from "@/lib/match-scoring";
import { SoftwareHeader } from "@/components/dashboard/SoftwareHeader";
import { ContactSupportDialog } from "@/components/dashboard/ContactSupportDialog";
import { SidebarBrand } from "@/components/dashboard/SidebarBrand";
import { SidebarCollapseButton } from "@/components/dashboard/SidebarCollapseButton";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { GameIcon, GameLabel } from "@/components/dashboard/GameLabel";
import {
  DEFAULT_ORGANIZER_LOGO,
  STANDINGS_TEMPLATE_HEIGHT,
  STANDINGS_TEMPLATE_WIDTH,
  StandingsTemplateRenderer,
  StandingsTemplateViewport,
  getStandingsTemplateMapOptions,
  type StandingsExportView,
  type StandingsTemplateRow,
  type StandingsTemplateVisibleSocials,
} from "@/components/dashboard/StandingsTemplateRenderer";
import {
  AutumnSeasonStandingsRenderer,
  AutumnStandingsViewport,
  AUTUMN_TEMPLATE_WIDTH,
  AUTUMN_TEMPLATE_HEIGHT,
  AUTUMN_TEMPLATE_BG_SRC,
  type AutumnSeasonTemplateRow,
} from "@/components/dashboard/AutumnSeasonTemplate";
import {
  GeneralTemplate1StandingsRenderer,
  GeneralTemplate1Viewport,
  GENERAL_TEMPLATE_1_WIDTH,
  GENERAL_TEMPLATE_1_HEIGHT,
} from "@/components/dashboard/GeneralTemplate1";
import {
  GeneralTemplate2StandingsRenderer,
  GeneralTemplate2Viewport,
  GENERAL_TEMPLATE_2_WIDTH,
  GENERAL_TEMPLATE_2_HEIGHT,
} from "@/components/dashboard/GeneralTemplate2";
import {
  GeneralTemplate3StandingsRenderer,
  GeneralTemplate3Viewport,
  GENERAL_TEMPLATE_3_WIDTH,
  GENERAL_TEMPLATE_3_HEIGHT,
} from "@/components/dashboard/GeneralTemplate3";
import {
  FreeFireThemeTemplateStandingsRenderer,
  FreeFireThemeTemplateViewport,
  FREE_FIRE_TEMPLATE_WIDTH,
  FREE_FIRE_TEMPLATE_HEIGHT,
} from "@/components/dashboard/FreeFireThemeTemplate";
import {
  TopShootersAutumnTemplateStandingsRenderer,
  TopShootersAutumnTemplateViewport,
  TOP_SHOOTERS_AUTUMN_WIDTH,
  TOP_SHOOTERS_AUTUMN_HEIGHT,
  type TopShooterItem,
} from "@/components/dashboard/TopShootersAutumnTemplate";
import {
  TopShootersGeneral1TemplateStandingsRenderer,
  TopShootersGeneral1TemplateViewport,
  TOP_SHOOTERS_GENERAL1_WIDTH,
  TOP_SHOOTERS_GENERAL1_HEIGHT,
} from "@/components/dashboard/TopShootersGeneral1Template";
import {
  TopShootersGeneral2TemplateStandingsRenderer,
  TopShootersGeneral2TemplateViewport,
  TOP_SHOOTERS_GENERAL2_WIDTH,
  TOP_SHOOTERS_GENERAL2_HEIGHT,
} from "@/components/dashboard/TopShootersGeneral2Template";
import { queue } from "@/components/ui/Toast";
import { GlobalPageLoader } from "@/components/ui/GlobalPageLoader";
import { beginExportProgress } from "@/lib/export-progress";
import { exportEventTeamsToExcel, exportFullEventToExcel } from "@/lib/event-teams-export";
import { exportStandingsToExcel } from "@/lib/standings-export";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useEventWorkspace, type WorkspaceMatch } from "@/hooks/use-event-workspace";
import {
  auditLogsApi,
  authApi,
  eventsApi,
  eventTeamsExportApi,
  catalogApi,
  matchesApi,
  persistUser,
  scoringRulesApi,
  teamsApi,
  templatesApi,
  type ApiAuditLog,
  type ApiEvent,
  type ApiScoringRule,
  type ApiTeam,
  type CreateAuditLogInput,
} from "@/lib/api";
import {
  apiGamesToCodeCatalogGames,
  getGameNameOptions,
  type CatalogGame,
} from "@/lib/games-catalog";
import {
  getStoredHtmlTemplates,
  type TemplateDocument as HtmlTemplateDocument,
} from "@/lib/html-standings-template-engine";
import {
  LEGACY_BATTLE_ROYALE_POINTS_TEMPLATE,
  PREMIUM_BATTLE_ROYALE_STANDINGS_TEMPLATE,
  type TemplateDocument as FinalizedTemplateDocument,
} from "@/lib/premium-standings-template-document";
import {
  PREMIUM_2_BATTLE_ROYALE_STANDINGS_TEMPLATE,
  finalizePremium2StandingsTemplate,
  isPremium2StandingsTemplate,
} from "@/lib/premium-2-standings-template-document";
import {
  apiTeamToPoolTeam,
  apiScoringRuleToTemplate,
  dataUrlToFile,
  getEventGame,
  isMongoId,
  placementArrayToMap,
  placementMapToArray,
  playersFromNames,
} from "@/lib/mappers";
import type { ScoringRuleTemplate } from "@/lib/scoring-rule-templates";
import { normalizeSlottedTeams } from "@/lib/team-slots";

const TeamExcelImportModal = lazy(() =>
  import("@/components/dashboard/TeamExcelImportModal").then((module) => ({
    default: module.TeamExcelImportModal,
  })),
);
const BulkAddTeamsModal = lazy(() =>
  import("@/components/dashboard/BulkAddTeamsModal").then((module) => ({
    default: module.BulkAddTeamsModal,
  })),
);
const AddTeamModal = lazy(() =>
  import("@/components/dashboard/AddTeamModal").then((module) => ({
    default: module.AddTeamModal,
  })),
);

export const Route = createFileRoute("/events/$eventId")({
  head: () => pageMeta('Event details', 'Manage event teams, matches, standings, scoring, and settings.'),
  component: EventPage,
});

function scoringRuleToMatchScoring(scoringRule: ApiEvent["scoringRuleId"]): EventScoringRules {
  if (!scoringRule || typeof scoringRule === "string") return DEFAULT_MATCH_SCORING;

  return {
    placementPoints: placementMapToArray(scoringRule.placementPoints),
    killPointsPerKill: scoringRule.killPoints ?? DEFAULT_MATCH_SCORING.killPointsPerKill,
  };
}

type AuditLogger = (input: CreateAuditLogInput) => Promise<void>;

function auditDisplayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "empty";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "empty";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function isObjectIdLike(value: unknown): value is string {
  return typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
}

function scoringRuleDisplayName(rule: ApiEvent["scoringRuleId"]) {
  if (!rule || typeof rule === "string") return "Custom scoring";
  return rule.name || "Custom scoring";
}

function auditValueKey(value: unknown): string {
  if (Array.isArray(value))
    return JSON.stringify(value.map((item) => String(item).trim()).filter(Boolean));
  if (value === null || value === undefined) return "";
  return JSON.stringify(value);
}

function auditChange(
  field: string,
  label: string,
  previousValue: unknown,
  newValue: unknown,
  message?: string,
) {
  if (auditValueKey(previousValue) === auditValueKey(newValue)) return null;
  return { field, label, type: "changed" as const, message, previousValue, newValue };
}

function auditAdded(field: string, label: string, newValue: unknown, message?: string) {
  return { field, label, type: "added" as const, message, previousValue: null, newValue };
}

function auditRemoved(field: string, label: string, previousValue: unknown, message?: string) {
  return { field, label, type: "removed" as const, message, previousValue, newValue: null };
}

function compactChanges(
  changes: Array<
    | ReturnType<typeof auditChange>
    | ReturnType<typeof auditAdded>
    | ReturnType<typeof auditRemoved>
    | null
  >,
) {
  return changes.filter((change): change is NonNullable<(typeof changes)[number]> =>
    Boolean(change),
  );
}

function listAuditChanges(
  field: string,
  itemLabel: string,
  previousItems: string[],
  nextItems: string[],
) {
  const previous = previousItems.map((item) => item.trim()).filter(Boolean);
  const next = nextItems.map((item) => item.trim()).filter(Boolean);
  if (auditValueKey(previous) === auditValueKey(next)) return [];

  const dp = Array.from({ length: previous.length + 1 }, () =>
    Array.from({ length: next.length + 1 }, () => 0),
  );
  for (let i = previous.length - 1; i >= 0; i--) {
    for (let j = next.length - 1; j >= 0; j--) {
      dp[i][j] =
        previous[i] === next[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const changes: Array<
    ReturnType<typeof auditChange> | ReturnType<typeof auditAdded> | ReturnType<typeof auditRemoved>
  > = [];
  const flushSegment = (removed: string[], added: string[], segmentIndex: number) => {
    const pairedCount = Math.min(removed.length, added.length);
    for (let index = 0; index < pairedCount; index++) {
      changes.push(
        auditChange(
          `${field}.renamed.${segmentIndex}.${index}`,
          `${itemLabel} name`,
          removed[index],
          added[index],
          `Changed ${itemLabel.toLowerCase()} name from ${removed[index]} to ${added[index]}.`,
        )!,
      );
    }
    const unpairedRemoved = removed.slice(pairedCount);
    const unpairedAdded = added.slice(pairedCount);
    if (unpairedRemoved.length > 0) {
      changes.push(
        auditRemoved(
          `${field}.removed.${segmentIndex}`,
          itemLabel,
          unpairedRemoved,
          `Deleted ${itemLabel.toLowerCase()}${unpairedRemoved.length === 1 ? "" : "s"}: ${unpairedRemoved.join(", ")}.`,
        ),
      );
    }
    if (unpairedAdded.length > 0) {
      changes.push(
        auditAdded(
          `${field}.added.${segmentIndex}`,
          itemLabel,
          unpairedAdded,
          `Added ${itemLabel.toLowerCase()}${unpairedAdded.length === 1 ? "" : "s"}: ${unpairedAdded.join(", ")}.`,
        ),
      );
    }
  };

  let i = 0;
  let j = 0;
  let segmentIndex = 0;
  while (i < previous.length || j < next.length) {
    if (i < previous.length && j < next.length && previous[i] === next[j]) {
      i++;
      j++;
      continue;
    }

    const removed: string[] = [];
    const added: string[] = [];
    while (i < previous.length || j < next.length) {
      if (i < previous.length && j < next.length && previous[i] === next[j]) break;
      if (j >= next.length || (i < previous.length && dp[i + 1][j] >= dp[i][j + 1])) {
        removed.push(previous[i]);
        i++;
      } else {
        added.push(next[j]);
        j++;
      }
    }
    flushSegment(removed, added, segmentIndex);
    segmentIndex++;
  }

  return changes;
}

function auditChangeText(
  change: import("@/lib/api").ApiAuditChange,
  scoringRuleNames: Record<string, string> = {},
) {
  if (change.message) return change.message;
  if (change.field === "scoringRuleId") {
    const previous = isObjectIdLike(change.previousValue)
      ? scoringRuleNames[change.previousValue] || auditDisplayValue(change.previousValue)
      : auditDisplayValue(change.previousValue);
    const next = isObjectIdLike(change.newValue)
      ? scoringRuleNames[change.newValue] || auditDisplayValue(change.newValue)
      : auditDisplayValue(change.newValue);
    return `Changed ${change.label} from ${previous} to ${next}.`;
  }
  if (change.type === "added") {
    return `Added ${change.label}: ${auditDisplayValue(change.newValue)}.`;
  }
  if (change.type === "removed") {
    return `Deleted ${change.label}: ${auditDisplayValue(change.previousValue)}.`;
  }
  return `Changed ${change.label} from ${auditDisplayValue(change.previousValue)} to ${auditDisplayValue(change.newValue)}.`;
}

const MESSAGE_ONLY_AUDIT_ACTIONS = new Set([
  "team_added",
  "teams_bulk_added",
  "team_removed",
  "match_created",
  "matches_bulk_created",
  "match_deleted",
  "match_results_entered",
  "scoring_created",
  "event_deleted",
]);

const MESSAGE_ONLY_TEAM_ORDER_ACTIONS = new Set([
  "team_reordered",
  "teams_reordered",
  "team_slots_reordered",
]);

function auditActionLabel(action: string) {
  if (MESSAGE_ONLY_TEAM_ORDER_ACTIONS.has(action)) return "Team order updated";
  return action
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function shouldShowAuditChanges(log: ApiAuditLog) {
  return (
    log.changes.length > 0 &&
    !MESSAGE_ONLY_AUDIT_ACTIONS.has(log.action) &&
    !MESSAGE_ONLY_TEAM_ORDER_ACTIONS.has(log.action)
  );
}

const eventTabTransitionVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    y: direction > 0 ? 28 : -28,
  }),
  center: {
    opacity: 1,
    y: 0,
  },
  exit: (direction: number) => ({
    opacity: 0,
    y: direction > 0 ? -28 : 28,
  }),
};

function EventPage() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const { user: viewer } = useCurrentUser();
  const [activeTab, setActiveTab] = useState("overview");
  const [tabDirection, setTabDirection] = useState(1);
  const [supportOpen, setSupportOpen] = useState(false);
  const { collapsed, toggle: toggleSidebar } = useSidebarCollapsed();
  const workspace = useEventWorkspace(eventId);
  useEffect(() => {
    if (activeTab === "teams") void workspace.loadPoolTeams();
  }, [activeTab, workspace.loadPoolTeams]);
  const event = workspace.displayEvent;
  const eventCreator =
    workspace.event?.organizerId && typeof workspace.event.organizerId !== "string"
      ? workspace.event.organizerId
      : null;
  const showAdminEventBanner = viewer?.role === "admin";
  const adminEventBannerMessage = eventCreator
    ? `Admin view: This event was created by ${eventCreator.name}${eventCreator.email ? ` (${eventCreator.email})` : ""}.`
    : "Admin view: You are viewing an event created by an organizer.";
  const organizerName =
    eventCreator?.name?.trim() ||
    viewer?.organization?.name?.trim() ||
    viewer?.name?.trim() ||
    "Organizer";
  const eventScoring = useMemo(
    () => scoringRuleToMatchScoring(workspace.event?.scoringRuleId),
    [workspace.event?.scoringRuleId],
  );
  const [isExportingFullEvent, setIsExportingFullEvent] = useState(false);
  const handleExportFullEvent = async () => {
    if (isExportingFullEvent || !workspace.event) return;
    setIsExportingFullEvent(true);
    const progress = await beginExportProgress();
    try {
      const sourceEvent = workspace.event;
      await exportFullEventToExcel({
        name: sourceEvent.name,
        game: sourceEvent.game,
        format: sourceEvent.format || "—",
        startDate: sourceEvent.startDate,
        endDate: sourceEvent.endDate,
        scoringPreset: scoringRuleDisplayName(sourceEvent.scoringRuleId),
        teams: workspace.workspaceTeams.map((team) => {
          const sourceTeam = workspace.eventTeams.find((candidate) => candidate._id === team.id);
          return {
            id: team.id,
            slot: team.slot,
            name: team.name,
            players: (sourceTeam?.players || []).map((player) => ({ id: player.playerId || player.name, name: player.name })),
            tags: team.tags,
            contactMobile: sourceTeam?.contactMobile,
          };
        }),
        matches: workspace.matches,
        scoring: eventScoring,
      }, (percent) => progress.update(percent));
      progress.complete();
      void logAudit({
        category: "export",
        action: "event_full_excel_exported",
        message: `Exported ${sourceEvent.name} as a full event workbook.`,
        metadata: { eventId, eventName: sourceEvent.name, teamCount: workspace.workspaceTeams.length, matchCount: workspace.matches.length },
      });
      queue.add({ title: "Excel export ready", description: `${sourceEvent.name} has been downloaded.`, variant: "success" }, { timeout: 5000 });
    } catch (error) {
      progress.dismiss();
      queue.add({ title: "Export failed", description: error instanceof Error ? error.message : "Could not export this event. Please try again.", variant: "error" }, { timeout: 5000 });
    } finally {
      setIsExportingFullEvent(false);
    }
  };
  const logAudit = useCallback<AuditLogger>(
    async (input) => {
      try {
        await auditLogsApi.create(eventId, input);
      } catch {
        // Audit logging should not block the user's completed action.
      }
    },
    [eventId],
  );

  const tabs = useMemo(
    () => [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "teams", label: "Teams", icon: Users },
      { id: "matches", label: "Matches", icon: Swords },
      { id: "standings", label: "Standings", icon: Trophy },
      { id: "settings", label: "Settings", icon: Settings },
      { id: "audit-logs", label: "Audit Logs", icon: History },
    ],
    [],
  );

  const setEventTab = useCallback(
    (nextTab: string) => {
      if (nextTab === activeTab) return;
      const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
      const nextIndex = tabs.findIndex((tab) => tab.id === nextTab);
      if (currentIndex !== -1 && nextIndex !== -1) {
        setTabDirection(nextIndex > currentIndex ? 1 : -1);
      }
      setActiveTab(nextTab);
    },
    [activeTab, tabs],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const currentIndex = Math.max(
        0,
        tabs.findIndex((tab) => tab.id === activeTab),
      );
      const numberKey = event.key.match(/^[1-9]$/)?.[0];

      if (event.ctrlKey && event.key.toLowerCase() === "h") {
        event.preventDefault();
        navigate({ to: "/" });
        return;
      }

      if (event.ctrlKey && numberKey) {
        const nextTab = tabs[Number(numberKey) - 1];
        if (!nextTab) return;
        event.preventDefault();
        setEventTab(nextTab.id);
        return;
      }

      const isArrowCycle = event.altKey && (event.key === "ArrowDown" || event.key === "ArrowUp");
      if (!isArrowCycle) return;
      event.preventDefault();
      const direction = event.key === "ArrowUp" ? -1 : 1;
      const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
      setEventTab(tabs[nextIndex].id);
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [activeTab, setEventTab, tabs]);

  if (workspace.loading) {
    return (
      <EventWorkspaceSkeleton
        activeTab={activeTab}
        tabs={tabs}
        onSelectTab={setEventTab}
      />
    );
  }

  if (workspace.error || !event) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-[#f7f8fb] p-8 text-center">
        <p className="text-[16px] font-semibold text-[#000000]">Event not found</p>
        <p className="max-w-md text-[14px] text-[#666666]">
          {workspace.error || "This event may have been deleted or you do not have access."}
        </p>
        <Link to="/events" className="text-[13px] font-medium text-[#000000] underline">
          Back to events
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f7f8fb] text-[#000000]">
      {showAdminEventBanner && (
        <div className="flex h-[38px] shrink-0 items-center justify-center border-b border-[#eab308] bg-[#ffd400] px-4 text-center text-[13px] font-semibold text-[#111111]">
          {adminEventBannerMessage}
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Event Sidepanel */}
        <aside
          className={`es-app-sidebar relative flex h-full min-h-0 shrink-0 flex-col border-r border-[#e5e7ef] bg-white transition-[width] duration-300 ease-in-out ${collapsed ? "w-[72px]" : "w-[260px]"}`}
        >
          <SidebarCollapseButton collapsed={collapsed} onToggle={toggleSidebar} className="top-[84px]" />
          <Link to="/" aria-label="Go to home" className="block shrink-0">
            <SidebarBrand />
          </Link>
          <nav className={`min-h-0 flex-1 space-y-0.5 overflow-x-hidden overflow-y-auto py-4 ${collapsed ? "px-2" : "px-3"}`}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const item = (
                <button
                  key={tab.id}
                  type="button"
                  aria-label={collapsed ? tab.label : undefined}
                  title={collapsed ? tab.label : undefined}
                  onClick={() => setEventTab(tab.id)}
                  className={`flex h-9 w-full cursor-pointer items-center overflow-hidden rounded-[6px] text-[14px] transition-all duration-300 ease-in-out ${collapsed ? "justify-start pl-[18px] pr-0" : "gap-3 px-3"} ${
                    isActive
                      ? "bg-[#f0f1f3] font-medium text-[#000000]"
                      : "text-[#666666] hover:bg-[#f7f8fb] hover:text-[#000000]"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${collapsed ? "ml-0 max-w-0 opacity-0" : "ml-0 max-w-[200px] opacity-100"}`}>
                    {tab.label}
                  </span>
                </button>
              );
              return collapsed ? (
                <TooltipProvider key={tab.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>{item}</TooltipTrigger>
                    <TooltipContent side="right">{tab.label}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : item;
            })}
          </nav>
          <button
            type="button"
            onClick={() => setSupportOpen(true)}
            title={collapsed ? "Contact support" : undefined}
            aria-label={collapsed ? "Contact support" : undefined}
            className={`mt-auto flex h-[56px] shrink-0 cursor-pointer items-center border-t border-[#eef0f5] text-[13px] text-[#8a90a0] transition-all duration-300 ease-in-out hover:bg-[#f9fbfc] hover:text-[#000000] ${collapsed ? "justify-center px-0" : "gap-3 px-6"}`}
          >
            <Headset className="h-5 w-5 shrink-0" />
            <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${collapsed ? "ml-0 max-w-0 opacity-0" : "max-w-[160px] opacity-100"}`}>Contact support</span>
          </button>
          <ContactSupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
        </aside>

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          <SoftwareHeader title="Event details" />

          {/* Header */}
          <header className="shrink-0 border-b border-[#e7e9f0] bg-white px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <Link
                  to="/events"
                  className="inline-flex items-center gap-2 text-[13px] font-medium text-[#666666] hover:text-[#000000] transition-colors mb-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Events
                </Link>
                <h1 className="text-[24px] font-semibold text-[#000000]">{event.name}</h1>
                <div className="mt-1.5 flex items-center gap-2 text-[13px] text-[#666666]">
                  <GameLabel
                    name={event.game}
                    logo={event.gameLogo}
                    className="font-medium text-[#000000]"
                    iconClassName="h-5 w-16"
                  />
                  <span className="text-[#d1d5db]">•</span>
                  <span>{event.format}</span>
                  <span className="text-[#d1d5db]">•</span>
                  <span>{event.teamsCount} Teams</span>
                  <span className="text-[#d1d5db]">•</span>
                  <span>{event.date}</span>
                </div>
              </div>
              {activeTab !== "matches" && (
                <div className="flex items-center gap-3">
                  {activeTab === "overview" && (
                    <button
                      type="button"
                      onClick={() => void handleExportFullEvent()}
                      disabled={isExportingFullEvent}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-[6px] border border-[#e2e5ec] bg-white px-4 py-2 text-[13px] font-medium text-[#000000] transition-colors hover:bg-[#f7f8fb] disabled:cursor-wait disabled:opacity-60"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      {isExportingFullEvent ? "Exporting…" : "Export Excel"}
                    </button>
                  )}
                  <button
                    onClick={() => setEventTab("matches")}
                    className="rounded-[6px] cursor-pointer bg-[#000000] px-5 py-2 text-[13px] font-medium text-white hover:bg-[#333] transition-colors"
                  >
                    Enter Results
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Tab Content */}
          <main className="min-h-0 flex-1 overflow-y-auto p-8">
            <AnimatePresence mode="wait" initial={false} custom={tabDirection}>
              <motion.div
                key={activeTab}
                custom={tabDirection}
                variants={eventTabTransitionVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="min-h-full"
              >
                {activeTab === "overview" && (
                  <OverviewTab
                    setActiveTab={setEventTab}
                    matches={workspace.matches}
                    leaderboard={workspace.leaderboard}
                    eventTeams={workspace.eventTeams}
                    teamsCount={event.teamsCount}
                  />
                )}
                {activeTab === "teams" && (
                  <TeamsTab
                    teams={workspace.workspaceTeams}
                    poolTeams={workspace.poolTeams}
                    eventId={event.id}
                    eventName={event.name}
                    organizerName={organizerName}
                    onTeamsChange={workspace.updateEventTeams}
                    onAuditLog={logAudit}
                  />
                )}
                {activeTab === "matches" && (
                  <MatchesTab
                    workspace={workspace}
                    eventScoring={eventScoring}
                    onAuditLog={logAudit}
                    organizerName={organizerName}
                    eventName={event.name}
                  />
                )}
                {activeTab === "standings" && (
                  <StandingsTab
                    event={workspace.event}
                    eventId={event.id}
                    leaderboard={workspace.leaderboard}
                    matches={workspace.matches}
                    teams={workspace.eventTeams}
                    scoringRule={workspace.event?.scoringRuleId}
                    onRefresh={workspace.refreshStandings}
                    onEnterResults={() => setEventTab("matches")}
                    onAuditLog={logAudit}
                  />
                )}
                {activeTab === "audit-logs" && <AuditLogsTab eventId={event.id} />}
                {activeTab === "settings" && (
                  <SettingsTab
                    event={workspace.event}
                    onEventUpdated={(updated) => workspace.setEvent(updated)}
                    onDeleted={() => navigate({ to: "/events" })}
                    onAuditLog={logAudit}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}

function EventWorkspaceSkeleton({
  activeTab,
  tabs,
  onSelectTab,
}: {
  activeTab: string;
  tabs: Array<{ id: string; label: string; icon: typeof LayoutDashboard }>;
  onSelectTab: (tab: string) => void;
}) {
  const rows = activeTab === "teams" ? 6 : activeTab === "matches" ? 4 : 5;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f7f8fb] text-[#000000]" aria-busy="true" aria-label="Loading event">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-[#e5e7ef] bg-white">
          <div className="flex h-[72px] items-center justify-center border-b border-[#eef0f5]">
            <img src="/Brand/new-logo.png" alt="Rangrove Points" className="h-11 w-auto object-contain" />
          </div>
          <div className="space-y-2 border-b border-[#e5e7ef] px-4 py-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-48" />
          </div>
          <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 py-4" aria-label="Event sections">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectTab(tab.id)}
                  aria-current={activeTab === tab.id ? "page" : undefined}
                  className={`flex w-full items-center gap-3 rounded-[6px] px-3 py-2 text-left text-[14px] ${activeTab === tab.id ? "bg-[#f0f1f3] font-medium text-[#000000]" : "text-[#666666]"}`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
          <div className="flex h-[56px] items-center border-t border-[#eef0f5] px-6">
            <Skeleton className="h-4 w-32" />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="h-[58px] shrink-0 border-b border-[#e7e9f0] bg-white" />
          <header className="shrink-0 space-y-3 border-b border-[#e7e9f0] bg-white px-8 py-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto p-8">
            {activeTab === "overview" ? (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
                </div>
                <div className="grid gap-6 xl:grid-cols-2">
                  {Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
                </div>
              </div>
            ) : activeTab === "settings" ? (
              <div className="max-w-3xl space-y-6 rounded-xl border border-[#e7e9f0] bg-white p-6">
                <Skeleton className="h-6 w-44" />
                {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-11 w-full" />)}
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-7 w-40" />
                  <Skeleton className="h-9 w-32 rounded-md" />
                </div>
                {activeTab === "standings" ? (
                  <div className="overflow-hidden rounded-xl border border-[#e7e9f0] bg-white p-4">
                    <Skeleton className="mb-4 h-10 w-full" />
                    {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="mb-2 h-12 w-full last:mb-0" />)}
                  </div>
                ) : activeTab === "audit-logs" ? (
                  <div className="overflow-hidden rounded-xl border border-[#e7e9f0] bg-white p-4">
                    {Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="mb-3 h-14 w-full last:mb-0" />)}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-[#e7e9f0] bg-white p-4">
                    {Array.from({ length: rows }, (_, i) => (
                      <div key={i} className="flex items-center gap-4 border-b border-[#eef0f5] py-4 last:border-0">
                        <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                        <div className="flex-1 space-y-2"><Skeleton className="h-4 w-40 max-w-full" /><Skeleton className="h-3 w-56 max-w-full" /></div>
                        <Skeleton className="h-8 w-20" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({
  setActiveTab,
  matches,
  leaderboard,
  eventTeams,
  teamsCount,
}: {
  setActiveTab: (tab: string) => void;
  matches: Array<{ id: string; name: string; map: string; status: string }>;
  leaderboard: Array<{
    rank: number;
    team?: { _id: string; name: string } | null;
    totalPoints: number;
  }>;
  eventTeams: ApiTeam[];
  teamsCount: number;
}) {
  const overviewMatches = matches.slice(0, 5).map((m) => ({
    id: m.id,
    name: m.name,
    map: m.map,
    status: m.status === "Completed" ? "Results entered" : "Pending",
  }));

  const previewTeams = eventTeams.slice(0, 6);
  const hasMatches = matches.length > 0;
  const eventTeamIds = new Set(eventTeams.map((team) => team._id));
  const scoredTeamIds = new Set<string>();
  const standingsPreview = [
    ...leaderboard.flatMap((row) => {
      const team = row.team;
      if (!team?._id || !eventTeamIds.has(team._id)) return [];
      scoredTeamIds.add(team._id);
      return [
        {
          id: team._id,
          name: team.name,
          pts: row.totalPoints,
        },
      ];
    }),
    ...eventTeams
      .filter((team) => !scoredTeamIds.has(team._id))
      .map((team) => ({
        id: team._id,
        name: team.name,
        pts: 0,
      })),
  ]
    .slice(0, 3)
    .map((team, index) => ({
      ...team,
      rank: index + 1,
    }));

  return (
    <div className="mx-auto max-w-[1200px] flex gap-8">
      {/* Left / Main Area */}
      <div className="flex-1 space-y-8">
        {/* Standings Glimpse */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[16px] font-semibold text-[#000000]">Standings Preview</h3>
            <button
              onClick={() => setActiveTab("standings")}
              className="text-[13px] font-medium text-[#666666] hover:text-[#000000] cursor-pointer"
            >
              View Full Standings
            </button>
          </div>
          {standingsPreview.length > 0 ? (
            <div className="overflow-hidden rounded-[10px] border border-[#e2e5ec] bg-white">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-[#e2e5ec] bg-[#f9fbfc]">
                  <tr>
                    <th className="w-[60px] px-5 py-2.5 font-medium text-[#666666]">Rank</th>
                    <th className="px-5 py-2.5 font-medium text-[#666666]">Team</th>
                    <th className="px-5 py-2.5 text-right font-medium text-[#666666]">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f1f3]">
                  {standingsPreview.map((team) => (
                    <tr key={team.id}>
                      <td className="px-5 py-3 font-semibold text-[#000000]">#{team.rank}</td>
                      <td className="px-5 py-3 font-medium text-[#000000]">{team.name}</td>
                      <td className="px-5 py-3 text-right font-semibold text-[#000000]">
                        {team.pts}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-[10px] border border-dashed border-[#d1d5db] bg-white px-5 py-8 text-center">
              <p className="text-[14px] font-medium text-[#000000]">No standings yet</p>
              <p className="mt-1 text-[13px] text-[#666666]">
                Enter match results to generate the leaderboard preview.
              </p>
            </div>
          )}
        </section>

        {/* Matches Glimpse */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[16px] font-semibold text-[#000000]">Matches</h3>
            <button
              onClick={() => setActiveTab("matches")}
              className="text-[13px] font-medium text-[#666666] hover:text-[#000000] cursor-pointer"
            >
              View All
            </button>
          </div>
          <div className="rounded-[10px] border border-[#e2e5ec] bg-white">
            {overviewMatches.length > 0 ? (
              <table className="w-full text-left">
                <tbody className="divide-y divide-[#f0f1f3]">
                  {overviewMatches.map((m) => (
                    <tr key={m.id} className="hover:bg-[#fcfdfd]">
                      <td className="px-5 py-3 text-[14px] font-medium text-[#000000]">{m.name}</td>
                      <td className="px-5 py-3 text-[13px] text-[#666666]">{m.map}</td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            m.status === "Pending"
                              ? "bg-[#f0f1f3] text-[#666666]"
                              : "bg-[#e2f5ec] text-[#059669]"
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center py-10 px-4 text-center">
                <Swords className="mb-3 h-8 w-8 text-[#c8cdd5]" />
                <p className="text-[14px] font-medium text-[#000000]">No matches created yet</p>
                <p className="mt-1 text-[13px] text-[#666666]">
                  Create your first match to start entering results.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("matches")}
                  className="mt-4 flex items-center gap-1.5 rounded-[6px] border border-[#e2e5ec] bg-white px-4 py-2 text-[13px] font-medium text-[#000000] hover:bg-[#f9fbfc]"
                >
                  <Plus className="h-4 w-4" /> Add Match
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Teams Glimpse */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[16px] font-semibold text-[#000000]">Teams Preview</h3>
            <button
              onClick={() => setActiveTab("teams")}
              className="text-[13px] font-medium text-[#666666] hover:text-[#000000] cursor-pointer"
            >
              Manage Teams
            </button>
          </div>
          {previewTeams.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {previewTeams.map((team) => (
                <div
                  key={team._id}
                  className="flex items-center gap-3 rounded-[8px] border border-[#e2e5ec] bg-white p-3"
                >
                  {team.logoUrl ? (
                    <img
                      src={team.logoUrl}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f0f1f3] text-[12px] font-semibold text-[#4b5563]">
                      {team.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[#000000]">{team.name}</p>
                    <p className="text-[11px] text-[#9aa1b0]">
                      {(team.players || []).length}{" "}
                      {(team.players || []).length === 1 ? "Player" : "Players"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[10px] border border-dashed border-[#d1d5db] bg-white px-5 py-8 text-center">
              <p className="text-[14px] font-medium text-[#000000]">No teams added yet</p>
              <p className="mt-1 text-[13px] text-[#666666]">
                Add teams to this event to show them here.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Right Area */}
      <div className="w-[320px] shrink-0 space-y-6">
        {/* Setup Checklist */}
        <div className="rounded-[10px] border border-[#e2e5ec] bg-white p-5">
          <h3 className="mb-4 text-[14px] font-semibold text-[#000000]">Setup Checklist</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#059669]" />
              <div>
                <p className="text-[13px] font-medium text-[#000000]">Configure Event Details</p>
                <p className="text-[12px] text-[#666666]">Basic info and format set</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#059669]" />
              <div>
                <p className="text-[13px] font-medium text-[#000000]">Add Teams</p>
                <p className="text-[12px] text-[#666666]">{teamsCount} teams registered</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              {hasMatches ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#059669]" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-[#c8cdd5]" />
              )}
              <div>
                <p className="text-[13px] font-medium text-[#000000]">Create Matches</p>
                <p className="text-[12px] text-[#666666]">
                  {hasMatches
                    ? `${matches.length} ${matches.length === 1 ? "match" : "matches"} created`
                    : "Add matches to start scoring"}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

type EventTeam = {
  id: string;
  slot: string;
  name: string;
  tags: string[];
  players: string[];
  logo?: string | null;
};

function eventTeamToApiPayload(team: EventTeam) {
  return {
    name: team.name.trim(),
    tags: team.tags,
    players: playersFromNames(team.players),
  };
}

function modalTeamToEventTeam(team: Team, id: string, slot: string): EventTeam {
  return {
    id,
    slot,
    name: team.name.trim(),
    tags: team.tags,
    players: team.players.filter((player) => player.trim() !== ""),
    logo: team.logo,
  };
}

function TeamsTab({
  teams: initialTeams,
  poolTeams,
  eventId,
  eventName,
  organizerName,
  onTeamsChange,
  onAuditLog,
}: {
  teams: import("@/hooks/use-event-workspace").WorkspaceEventTeam[];
  poolTeams: import("@/lib/api").ApiTeam[];
  eventId: string;
  eventName: string;
  organizerName: string;
  onTeamsChange: (teamIds: string[]) => Promise<void>;
  onAuditLog: AuditLogger;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedTeamId, setDraggedTeamId] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<EventTeam | null>(null);
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [teamPendingDelete, setTeamPendingDelete] = useState<EventTeam | null>(null);
  const [exportingTeams, setExportingTeams] = useState(false);
  const [teams, setTeams] = useState<EventTeam[]>(initialTeams);
  const teamsRef = useRef<EventTeam[]>(initialTeams);
  const dragStartTeamsRef = useRef<EventTeam[] | null>(null);
  const isFinalizingDragRef = useRef(false);
  const teamRowRefs = useRef(new Map<string, HTMLTableRowElement>());
  const previousRowRectsRef = useRef(new Map<string, DOMRect>());

  useEffect(() => {
    setTeams(initialTeams);
    teamsRef.current = initialTeams;
  }, [initialTeams]);

  const filteredTeams = teams.filter((team) => {
    const query = searchQuery.toLowerCase();
    return (
      team.name.toLowerCase().includes(query) ||
      team.tags.some((tag) => tag.toLowerCase().includes(query)) ||
      team.players.some((player) => player.toLowerCase().includes(query))
    );
  });

  const handleExportTeams = async (format: "excel" | "image") => {
    if (exportingTeams) return;
    if (teams.length === 0) {
      queue.add({ title: "Nothing to export", description: "Add teams to this event before exporting.", variant: "error" }, { timeout: 4000 });
      return;
    }
    setExportingTeams(true);
    const progress = await beginExportProgress();
    try {
      if (format === "excel") {
        await exportEventTeamsToExcel(eventName, teams, (percent) => progress.update(percent));
      } else {
        const file = await eventTeamsExportApi.generate(eventId, format, (percent) => {
          progress.update(percent);
        });
        const downloadUrl = URL.createObjectURL(file.blob);
        const downloadLink = document.createElement("a");
        downloadLink.href = downloadUrl;
        downloadLink.download = file.filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);
      }
      progress.complete();
      void onAuditLog({
        category: "export",
        action: format === "image" ? "event_teams_image_exported" : "event_teams_excel_exported",
        message: `Exported ${teams.length} event teams as ${format === "image" ? "an image" : "Excel"}.`,
        metadata: { eventId, eventName, teamCount: teams.length, format },
      }).catch((error) => console.error("Could not record event team export", error));
      queue.add({ title: "Export ready", description: `The event team ${format === "image" ? "image" : "spreadsheet"} has been downloaded.`, variant: "success" }, { timeout: 4000 });
    } catch (error) {
      progress.dismiss();
      queue.add({ title: "Export failed", description: error instanceof Error ? error.message : "Could not export the event teams. Please try again.", variant: "error" }, { timeout: 5000 });
    } finally {
      setExportingTeams(false);
    }
  };

  const persistTeams = async (nextTeams: EventTeam[]) => {
    setTeams(nextTeams);
    teamsRef.current = nextTeams;
    await onTeamsChange(nextTeams.map((t) => t.id));
  };

  const persistCurrentVisualTeamOrder = async (nextTeams: EventTeam[]) => {
    teamsRef.current = nextTeams;
    previousRowRectsRef.current = new Map();
    await onTeamsChange(nextTeams.map((t) => t.id));
  };

  const captureTeamRowPositions = () => {
    const positions = new Map<string, DOMRect>();
    teamRowRefs.current.forEach((row, id) => {
      positions.set(id, row.getBoundingClientRect());
    });
    previousRowRectsRef.current = positions;
  };

  useLayoutEffect(() => {
    const previousPositions = previousRowRectsRef.current;
    if (previousPositions.size === 0) return;

    const animations: Array<() => void> = [];
    teamRowRefs.current.forEach((row, id) => {
      const previous = previousPositions.get(id);
      if (!previous) return;

      const current = row.getBoundingClientRect();
      const deltaY = previous.top - current.top;
      if (Math.abs(deltaY) < 1) return;

      row.style.transition = "none";
      row.style.transform = `translateY(${deltaY}px)`;
      row.style.willChange = "transform";

      animations.push(() => {
        row.style.transition = "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)";
        row.style.transform = "translateY(0)";
        window.setTimeout(() => {
          row.style.transition = "";
          row.style.transform = "";
          row.style.willChange = "";
        }, 240);
      });
    });

    previousRowRectsRef.current = new Map();
    requestAnimationFrame(() => {
      animations.forEach((animate) => animate());
    });
  }, [teams]);

  const updateTeamDetails = async (team: EventTeam) => {
    const payload = eventTeamToApiPayload(team);
    const logoFile = team.logo?.startsWith("data:") ? dataUrlToFile(team.logo) : null;
    const updated = await teamsApi.update(team.id, { ...payload, logoFile });

    return {
      ...team,
      name: updated.name,
      tags: updated.tags || [],
      players: (updated.players || []).map((player) => player.name),
      logo: updated.logoUrl || null,
    } satisfies EventTeam;
  };

  const reorderTeam = (targetTeamId: string, placement: "before" | "after") => {
    if (!draggedTeamId || draggedTeamId === targetTeamId) return;

    captureTeamRowPositions();
    setTeams((currentTeams) => {
      const draggedIndex = currentTeams.findIndex((team) => team.id === draggedTeamId);
      const targetIndex = currentTeams.findIndex((team) => team.id === targetTeamId);
      if (draggedIndex === -1 || targetIndex === -1) return currentTeams;

      const nextTeams = [...currentTeams];
      const [draggedTeam] = nextTeams.splice(draggedIndex, 1);
      const adjustedTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
      const insertIndex = placement === "after" ? adjustedTargetIndex + 1 : adjustedTargetIndex;

      if (draggedIndex === insertIndex) return currentTeams;

      nextTeams.splice(insertIndex, 0, draggedTeam);
      const reordered = nextTeams.map((team, index) => ({
        ...team,
        slot: String(index + 1).padStart(2, "0"),
      }));
      teamsRef.current = reordered;
      return reordered;
    });
  };

  const finalizeTeamReorder = async () => {
    if (isFinalizingDragRef.current) return;
    const draggedId = draggedTeamId;
    const startTeams = dragStartTeamsRef.current;
    const finalTeams = teamsRef.current;

    setDraggedTeamId(null);
    dragStartTeamsRef.current = null;
    if (!draggedId || !startTeams) return;

    const startOrder = startTeams.map((team) => team.id).join("|");
    const finalOrder = finalTeams.map((team) => team.id).join("|");
    if (startOrder === finalOrder) return;

    isFinalizingDragRef.current = true;
    try {
      await persistCurrentVisualTeamOrder(finalTeams);
      const previousTeam = startTeams.find((team) => team.id === draggedId);
      const movedTeam = finalTeams.find((team) => team.id === draggedId);
      if (previousTeam && movedTeam && previousTeam.slot !== movedTeam.slot) {
        await onAuditLog({
          category: "team",
          action: "team_reordered",
          message: `Changed ${movedTeam.name} slot from ${previousTeam.slot} to ${movedTeam.slot}.`,
          changes: [auditChange("slot", "Slot", previousTeam.slot, movedTeam.slot)!],
          metadata: { teamId: movedTeam.id, teamName: movedTeam.name },
        });
      }
    } finally {
      isFinalizingDragRef.current = false;
    }
  };

  const handleTeamDragOver = (event: DragEvent<HTMLTableRowElement>, targetTeamId: string) => {
    event.preventDefault();
    const rowBounds = event.currentTarget.getBoundingClientRect();
    const placement = event.clientY > rowBounds.top + rowBounds.height / 2 ? "after" : "before";
    reorderTeam(targetTeamId, placement);
  };

  const deleteTeam = async (teamId: string) => {
    const removedTeam = teams.find((team) => team.id === teamId);
    const next = teams
      .filter((team) => team.id !== teamId)
      .map((team, index) => ({
        ...team,
        slot: String(index + 1).padStart(2, "0"),
      }));
    await persistTeams(next);
    if (removedTeam) {
      await onAuditLog({
        category: "team",
        action: "team_removed",
        message: `Removed ${removedTeam.name} from the event.`,
        metadata: { teamId: removedTeam.id, teamName: removedTeam.name },
      });
    }
  };

  const processEventTeams = (teamsList: EventTeam[]): EventTeam[] => {
    return normalizeSlottedTeams(teamsList, "slot", 2);
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        showAddTeamModal ||
        showBulkAddModal ||
        showExcelImportModal ||
        editingTeam ||
        teamPendingDelete
      )
        return;
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;
      if (isTyping) return;

      const key = event.key.toLowerCase();
      if (!["n", "b", "i"].includes(key)) return;

      event.preventDefault();
      if (key === "n") setShowAddTeamModal(true);
      if (key === "b") setShowBulkAddModal(true);
      if (key === "i") setShowExcelImportModal(true);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showAddTeamModal, showBulkAddModal, showExcelImportModal, editingTeam, teamPendingDelete]);

  const createEventOnlyTeam = async (team: Team) => {
    if (isMongoId(team.id)) return team.id;

    const logoFile = team.logo ? dataUrlToFile(team.logo) : null;
    const payload = {
      name: team.name.trim(),
      tags: team.tags,
      contactMobile: team.contactMobile || undefined,
      players: playersFromNames(team.players),
      logoFile,
      isPoolTeam: team.addToDatabase,
      source: "event" as const,
      sourceEventId: eventId,
      sourceEventName: eventName,
    };
    const created = logoFile
      ? await teamsApi.createWithLogo(payload)
      : await teamsApi.create(payload);
    return created._id;
  };

  const handleAddTeam = async (team: Team) => {
    const slot = team.slotNumber.trim();
    const teamId = await createEventOnlyTeam(team);
    const next = processEventTeams([...teams, modalTeamToEventTeam(team, teamId, slot)]);
    await persistTeams(next);
    await onAuditLog({
      category: "team",
      action: "team_added",
      message: `Added ${team.name.trim()} to the event.`,
      metadata: { teamId, teamName: team.name.trim() },
    });
  };

  const handleAddTeams = async (newTeams: Team[]) => {
    const added = await Promise.all(
      newTeams.map(async (team) => {
        const slot = team.slotNumber.trim();
        const teamId = await createEventOnlyTeam(team);
        return modalTeamToEventTeam(team, teamId, slot);
      }),
    );
    const next = processEventTeams([...teams, ...added]);
    await persistTeams(next);
    const teamNames = added.map((team) => team.name);
    await onAuditLog({
      category: "team",
      action: "teams_bulk_added",
      message: `Added teams: ${teamNames.join(", ")}.`,
      metadata: { teamIds: added.map((team) => team.id), teamNames },
    });
  };

  return (
    <div className="mx-auto flex h-full max-w-[1200px] flex-col">
      <div className="mb-8 flex items-end justify-between gap-6">
        <div>
          <h2 className="text-[24px] font-semibold text-[#000000]">Teams</h2>
          <p className="mt-1 text-[14px] text-[#666666]">
            View and manage all teams registered for this event.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <AppDropdownMenu
            widthClass="w-[160px]"
            trigger={
              <button disabled={exportingTeams} className="flex h-[38px] cursor-pointer items-center gap-2 rounded-[6px] border border-[#e2e5ec] bg-white px-5 text-[14px] font-medium text-[#000000] outline-none transition-colors hover:bg-[#f7f8fb] data-[state=open]:bg-[#f0f1f3] disabled:cursor-not-allowed disabled:opacity-60">
                <FileDown className="h-4 w-4" />
                Export
                <ChevronDown className="h-4 w-4" />
              </button>
            }
            items={[
              { label: "Excel", icon: <FileDown className="h-4 w-4" />, onSelect: () => void handleExportTeams("excel") },
              { label: "Image", icon: <ImageIcon className="h-4 w-4" />, onSelect: () => void handleExportTeams("image") },
            ]}
          />
          <button
            type="button"
            onClick={() => setShowBulkAddModal(true)}
            className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[6px] border border-[#e2e5ec] bg-white px-4 text-[13px] font-medium text-[#000000] transition-colors hover:bg-[#f9fbfc]"
          >
            <Users className="h-4 w-4" />
            Bulk add
          </button>
          <button
            type="button"
            onClick={() => setShowExcelImportModal(true)}
            className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[6px] border border-[#e2e5ec] bg-white px-4 text-[13px] font-medium text-[#000000] transition-colors hover:bg-[#f9fbfc]"
          >
            <Import className="h-4 w-4" />
            Import excel
          </button>
          <button
            type="button"
            onClick={() => setShowAddTeamModal(true)}
            className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[6px] bg-[#000000] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#333]"
          >
            <Plus className="h-4 w-4" />
            Add Team
          </button>
        </div>
      </div>

      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="relative w-[360px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1b0]" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search teams or players"
            className="h-[38px] w-full rounded-[6px] border-2 border-[#eef0f4] bg-white pl-9 pr-3 text-[13px] outline-none placeholder:text-[#9aa1b0] transition-all duration-200 focus:border-[#000000]"
          />
        </div>
        <div className="text-[13px] text-[#666666]">
          {filteredTeams.length} of {teams.length} teams
        </div>
      </div>

      {filteredTeams.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-[12px] border border-dashed border-[#d1d5db] bg-white px-6 py-20 text-center">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-[#f0f1f3]">
            <Users className="h-6 w-6 text-[#9aa1b0]" />
          </div>
          <h3 className="text-[17px] font-semibold text-[#000000]">No teams found</h3>
          <p className="mt-2 max-w-[340px] text-[14px] text-[#666666]">
            Try a different search or add teams to this event.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[10px] border border-[#e2e5ec] bg-white">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-[#e2e5ec] bg-[#f9fbfc]">
              <tr>
                <th className="w-[54px] px-4 py-3"></th>
                <th className="w-[90px] px-6 py-3 font-medium uppercase tracking-wider text-[#4b5563]">
                  Slot
                </th>
                <th className="px-6 py-3 font-medium uppercase tracking-wider text-[#4b5563]">
                  Team
                </th>
                <th className="px-6 py-3 font-medium uppercase tracking-wider text-[#4b5563]">
                  Players
                </th>
                <th className="w-[130px] px-6 py-3 font-medium uppercase tracking-wider text-[#4b5563]">
                  Tag
                </th>
                <th className="w-[120px] px-6 py-3 text-right font-medium uppercase tracking-wider text-[#4b5563]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f1f3]">
              {filteredTeams.map((team) => (
                <tr
                  key={team.id}
                  ref={(node) => {
                    if (node) teamRowRefs.current.set(team.id, node);
                    else teamRowRefs.current.delete(team.id);
                  }}
                  draggable
                  onDragStart={(event) => {
                    setDraggedTeamId(team.id);
                    dragStartTeamsRef.current = teamsRef.current;
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(event) => handleTeamDragOver(event, team.id)}
                  onDrop={() => void finalizeTeamReorder()}
                  onDragEnd={() => void finalizeTeamReorder()}
                  className={`group transition-[background-color,opacity,transform] duration-150 hover:bg-[#fcfdfd] ${
                    draggedTeamId === team.id ? "scale-[0.995] bg-[#f7f8fb] opacity-50" : ""
                  }`}
                >
                  <td className="px-4 py-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className={`grid h-8 w-8 cursor-grab place-items-center rounded-[6px] transition-colors hover:bg-[#f7f8fb] hover:text-[#4b5563] active:cursor-grabbing ${
                              draggedTeamId === team.id
                                ? "bg-[#e8eef7] text-[#000000]"
                                : "text-[#9aa1b0]"
                            }`}
                            aria-label={`Drag ${team.name}`}
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Drag to reorder</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </td>
                  <td className="px-6 py-4 font-semibold text-[#000000]">#{team.slot}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {team.logo ? (
                        <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[#171717]">
                          <img
                            src={team.logo}
                            alt={`${team.name} logo`}
                            className="h-full w-full scale-[1.2] rounded-full object-cover"
                            loading="lazy"
                          />
                        </span>
                      ) : (
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f0f1f3] text-[13px] font-semibold text-[#4b5563]">
                          {team.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-[14px] font-semibold text-[#000000]">{team.name}</p>
                        <p className="text-[12px] text-[#9aa1b0]">{team.players.length} players</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {team.players.map((player) => (
                        <span
                          key={player}
                          className="rounded-full bg-[#f0f1f3] px-2.5 py-1 text-[12px] text-[#4b5563]"
                        >
                          {player}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {team.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-[4px] bg-[#f0f1f3] px-2 py-0.5 text-[11px] font-semibold text-[#4b5563]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => setEditingTeam(team)}
                              className="cursor-pointer rounded-[5px] p-1.5 text-[#9aa1b0] transition-colors hover:bg-[#f7f8fb] hover:text-[#000000]"
                              aria-label={`Edit ${team.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Edit team</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => setTeamPendingDelete(team)}
                              className="cursor-pointer rounded-[5px] p-1.5 text-[#9aa1b0] transition-colors hover:bg-[#fee2e2] hover:text-[#ef4444]"
                              aria-label={`Delete ${team.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Delete team</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <TeamInfoModal
        open={Boolean(editingTeam)}
        team={editingTeam}
        onOpenChange={(open) => {
          if (!open) setEditingTeam(null);
        }}
        onSave={async (updatedTeam) => {
          const previousTeam = teams.find((team) => team.id === updatedTeam.id);
          const savedTeam = await updateTeamDetails(updatedTeam);
          const next = teams.map((team) => (team.id === savedTeam.id ? savedTeam : team));
          const sorted = processEventTeams(next);
          await persistTeams(sorted);
          const finalTeam = sorted.find((team) => team.id === savedTeam.id) ?? savedTeam;
          const changes = previousTeam
            ? compactChanges([
                auditChange("name", "Team name", previousTeam.name, finalTeam.name),
                auditChange("slot", "Slot", previousTeam.slot, finalTeam.slot),
                ...listAuditChanges("players", "Player", previousTeam.players, finalTeam.players),
                ...listAuditChanges("tags", "Tag", previousTeam.tags, finalTeam.tags),
                auditChange(
                  "logo",
                  "Logo",
                  previousTeam.logo ? "Existing logo" : "No logo",
                  finalTeam.logo ? "Existing logo" : "No logo",
                ),
              ])
            : [];
          if (changes.length > 0) {
            await onAuditLog({
              category: "team",
              action: "team_updated",
              message: `Changed ${previousTeam?.name || finalTeam.name}.`,
              changes,
              metadata: { teamId: finalTeam.id, teamName: finalTeam.name },
            });
          }
          setEditingTeam(null);
        }}
      />

      {showAddTeamModal && (
        <Suspense fallback={null}>
          <AddTeamModal
            open
            onOpenChange={setShowAddTeamModal}
            onAddTeam={handleAddTeam}
            poolTeams={poolTeams.map(apiTeamToPoolTeam)}
            mode="event"
            sourceEventId={eventId}
            sourceEventName={eventName}
          />
        </Suspense>
      )}

      {showBulkAddModal && (
        <Suspense fallback={null}>
          <BulkAddTeamsModal open onOpenChange={setShowBulkAddModal} onAddTeams={handleAddTeams} />
        </Suspense>
      )}

      {showExcelImportModal && (
        <Suspense fallback={null}>
          <TeamExcelImportModal open onOpenChange={setShowExcelImportModal} onImport={handleAddTeams} />
        </Suspense>
      )}

      <ThemedConfirmDialog
        open={teamPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setTeamPendingDelete(null);
        }}
        title="Delete team?"
        description={
          teamPendingDelete ? `${teamPendingDelete.name} will be removed from this event.` : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (!teamPendingDelete) return;
          void deleteTeam(teamPendingDelete.id);
          setTeamPendingDelete(null);
        }}
      />
    </div>
  );
}

function TeamInfoModal({
  open,
  team,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  team: EventTeam | null;
  onOpenChange: (open: boolean) => void;
  onSave: (team: EventTeam) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [slot, setSlot] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [players, setPlayers] = useState<string[]>([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tagsContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [maxTagChars, setMaxTagChars] = useState(20);
  const playerInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const prevPlayersLength = useRef(players.length);

  useEffect(() => {
    if (!team) return;
    setName(team.name);
    setLogo(team.logo ?? null);
    setSlot(team.slot);
    setTags(team.tags || []);
    setPlayers(team.players.length > 0 ? team.players : [""]);
  }, [team]);

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

  useEffect(() => {
    if (players.length > prevPlayersLength.current) {
      const lastInput = playerInputsRef.current[players.length - 1];
      if (lastInput) lastInput.focus();
    }
    prevPlayersLength.current = players.length;
  }, [players.length]);

  const handleClose = () => {
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
    reader.onloadend = () => {
      setLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
    event.target.value = "";
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!team || isSubmitting) return;

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
      await onSave({
        ...team,
        name: name.trim(),
        logo,
        slot,
        tags: tags.filter((t) => t.trim() !== ""),
        players: players.filter((player) => player.trim() !== ""),
      });

      queue.add(
        {
          title: "Team updated",
          description: `${name.trim()} has been saved successfully.`,
          variant: "success",
        },
        { timeout: 5000 },
      );
      handleClose();
    } catch (err) {
      queue.add(
        {
          title: "Could not update team",
          description: err instanceof Error ? err.message : "Please try again.",
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

  const addPlayerField = () => setPlayers((currentPlayers) => [...currentPlayers, ""]);

  const handlePlayerKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter" && !e.ctrlKey) {
      e.preventDefault();
      addPlayerField();
    }
  };

  const updatePlayer = (index: number, value: string) => {
    setPlayers((currentPlayers) =>
      currentPlayers.map((player, playerIndex) => (playerIndex === index ? value : player)),
    );
  };

  const removePlayer = (index: number) => {
    if (players.length <= 1) return;
    setPlayers((currentPlayers) =>
      currentPlayers.filter((_, playerIndex) => playerIndex !== index),
    );
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const totalChars = tags.join("").length;
      if (totalChars + tagInput.trim().length > maxTagChars) return;
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

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? onOpenChange(true) : handleClose())}>
      <DialogContent
        hideCloseButton
        className="flex max-h-[90vh] w-full max-w-[500px] flex-col gap-0 overflow-hidden rounded-[16px] border border-[#e2e5ec] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.12)]"
      >
        <DialogTitle className="sr-only">Edit Team</DialogTitle>

        <div className="flex items-center justify-between border-b border-[#f0f1f3] px-6 py-4">
          <h2 className="text-[18px] font-semibold text-[#000000]">Edit Team</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form
            id="edit-team-form"
            onSubmit={handleSubmit}
            onKeyDown={handleFormKeyDown}
            className="space-y-5"
          >
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-[#e2e5ec] bg-[#171717]">
                {logo ? (
                  <img src={logo} alt="Logo" className="h-full w-full scale-[1.2] rounded-full object-cover" />
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
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter team name"
                className="h-[40px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[14px] text-[#000000] outline-none placeholder:text-[#b0b7c4] focus:border-[#000000]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                  Slot Number
                </label>
                <input
                  type="number"
                  min="1"
                  value={slot}
                  onChange={(event) => setSlot(event.target.value)}
                  placeholder="e.g. 1"
                  className="h-[40px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[14px] text-[#000000] outline-none placeholder:text-[#b0b7c4] focus:border-[#000000]"
                />
              </div>
              <div className="relative" ref={tagsContainerRef}>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-[13px] font-medium text-[#4b5563]">Tags</label>
                  <span
                    className={`text-[11px] ${tags.join("").length + tagInput.length >= maxTagChars ? "text-[#dc2626]" : "text-[#9aa1b0]"}`}
                  >
                    {tags.join("").length + tagInput.length}/{maxTagChars}
                  </span>
                </div>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={
                    tags.join("").length >= maxTagChars ? "Limit reached" : "e.g. Pro, Invited"
                  }
                  disabled={tags.join("").length >= maxTagChars}
                  className="h-[40px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[14px] text-[#000000] outline-none placeholder:text-[#b0b7c4] focus:border-[#000000] disabled:bg-[#f7f8fb] disabled:cursor-not-allowed"
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

            <div className="mt-4">
              <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                Team Players
              </label>
              <div className="space-y-2">
                {players.map((player, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      ref={(el) => {
                        playerInputsRef.current[index] = el;
                      }}
                      type="text"
                      value={player}
                      onChange={(event) => updatePlayer(index, event.target.value)}
                      onKeyDown={(e) => handlePlayerKeyDown(e, index)}
                      placeholder={`Player ${index + 1}`}
                      className="h-[36px] flex-1 rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[13px] text-[#000000] outline-none placeholder:text-[#b0b7c4] focus:border-[#000000]"
                    />
                    {players.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePlayer(index)}
                        className="grid h-[36px] w-[36px] cursor-pointer place-items-center rounded-[8px] border border-[#e2e5ec] bg-[#f9fbfc] text-[#9aa1b0] hover:border-[#fca5a5] hover:bg-[#fee2e2] hover:text-[#ef4444]"
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
            form="edit-team-form"
            disabled={isSubmitting}
            className="flex cursor-pointer items-center gap-2 rounded-[8px] bg-[#000000] px-5 py-2 text-[13px] font-medium text-white hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
            <div className="flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
              Ctrl + <CornerDownLeft className="h-3 w-3" />
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type EventMatch = {
  id: string;
  name: string;
  map: string;
  status: "Pending Results" | "Completed";
  results: ResultEntry[];
  order: number;
};

function MatchesTab({
  workspace,
  eventScoring,
  onAuditLog,
  organizerName,
  eventName,
}: {
  workspace: ReturnType<typeof useEventWorkspace>;
  eventScoring: EventScoringRules;
  onAuditLog: AuditLogger;
  organizerName?: string;
  eventName?: string;
}) {
  const resolvedOrganizerName =
    organizerName ||
    (typeof workspace.event?.organizerId === "object" ? workspace.event?.organizerId?.name?.trim() : "") ||
    "";
  const resolvedEventName = eventName || workspace.event?.name || "";
  const matches = workspace.matches as EventMatch[];
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [resultsMatch, setResultsMatch] = useState<EventMatch | null>(null);
  const [viewResultsMatch, setViewResultsMatch] = useState<EventMatch | null>(null);
  const [viewResultsOpen, setViewResultsOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<EventMatch | null>(null);
  const [matchPendingDelete, setMatchPendingDelete] = useState<EventMatch | null>(null);
  const [matchTemplateExport, setMatchTemplateExport] = useState<{
    match: EventMatch;
    results: ResultEntry[];
  } | null>(null);
  const matchMapOptions = useMemo(() => {
    const gameName = workspace.event ? getEventGame(workspace.event).name : "";
    const options: Array<{ label: string; value: string }> = [
      ...getStandingsTemplateMapOptions(gameName),
    ];
    matches.forEach((match) => {
      if (
        match.map &&
        !options.some((option) => option.value.toLowerCase() === match.map.toLowerCase())
      ) {
        options.push({ label: match.map, value: match.map });
      }
    });
    return options;
  }, [workspace.event, matches]);

  const handleAddMatch = async (match: MatchInput) => {
    await workspace.addMatch(match);
    await onAuditLog({
      category: "match",
      action: "match_created",
      message: `Created match ${match.name}.`,
      metadata: { matchName: match.name, map: match.map },
    });
  };

  const handleAddMatches = async (newMatches: MatchInput[]) => {
    await workspace.addMatches(newMatches);
    const matchNames = newMatches.map((match) => match.name);
    await onAuditLog({
      category: "match",
      action: "matches_bulk_created",
      message: `Created matches: ${matchNames.join(", ")}.`,
      metadata: { matchNames },
    });
  };

  const handleUpdateMatchResults = (matchId: string, results: ResultEntry[]) => {
    const target = matches.find((m) => m.id === matchId);
    if (target) setResultsMatch({ ...target, results });
  };

  const handleMarkMatchCompleted = async (matchId: string) => {
    const previousMatch = matches.find((m) => m.id === matchId);
    const match =
      previousMatch?.id === resultsMatch?.id ? resultsMatch : (previousMatch ?? resultsMatch);
    if (!match) return;
    await workspace.persistMatchResults(matchId, match.results);
    const hadResults = Boolean(previousMatch?.results.length);
    await onAuditLog({
      category: "result",
      action: hadResults ? "match_results_updated" : "match_results_entered",
      message: `${hadResults ? "Updated" : "Entered"} results for ${match.name}.`,
      changes: hadResults
        ? compactChanges([
            auditChange(
              "results",
              "Result rows",
              previousMatch?.results.length ?? 0,
              match.results.length,
            ),
            auditChange(
              "status",
              "Match status",
              previousMatch?.status ?? "Pending Results",
              "Completed",
            ),
          ])
        : [],
      metadata: { matchId, matchName: match.name },
    });
    queue.add(
      {
        title: "Results saved",
        description: "Match results have been recorded.",
        variant: "success",
      },
      { timeout: 4000 },
    );
  };

  const describeResultChanges = (previous: ResultEntry, next: ResultEntry, teamName: string) => {
    const playerNameById = new Map(
      workspace.matchTeamsData
        .flatMap((team) => team.players)
        .map((player) => [player.id, player.name]),
    );
    const formatKills = (kills: ResultEntry["playerKills"]) =>
      Object.entries(kills || {})
        .map(([playerId, value]) => `${playerNameById.get(playerId) || playerId}: ${value || 0}`)
        .join(", ");

    return compactChanges([
      auditChange("position", "Position", previous.position || "empty", next.position || "empty"),
      auditChange("totalKills", "Total kills", previous.totalKills || 0, next.totalKills || 0),
      auditChange(
        "playerKills",
        "Player kills",
        formatKills(previous.playerKills),
        formatKills(next.playerKills),
        `Changed player kills for ${teamName}.`,
      ),
    ]);
  };

  const handleSaveViewedMatchResults = async (
    match: {
      id: string | number;
      name: string;
      map: string;
      status: "Pending Results" | "Completed";
      results: ResultEntry[];
    },
    results: ResultEntry[],
    context: ResultEditContext,
  ) => {
    await workspace.persistMatchResults(String(match.id), results);
    const teamById = new Map(workspace.matchTeamsData.map((team) => [team.id, team.name]));
    const logContext = async (entry: Exclude<ResultEditContext, { type: "batch" }>) => {
      if (entry.type === "team-edited") {
        const teamName = teamById.get(entry.next.teamId) || "Unknown team";
        await onAuditLog({
          category: "result",
          action: "match_results_updated",
          message: `Edited ${teamName} result in ${match.name}.`,
          changes: describeResultChanges(entry.previous, entry.next, teamName),
          metadata: {
            matchId: match.id,
            matchName: match.name,
            teamId: entry.next.teamId,
            teamName,
          },
        });
        return;
      }

      if (entry.type === "result-deleted") {
        const teamName = teamById.get(entry.previous.teamId) || "Unknown team";
        await onAuditLog({
          category: "result",
          action: "match_results_updated",
          message: `Removed ${teamName} result from ${match.name}.`,
          metadata: {
            matchId: match.id,
            matchName: match.name,
            teamId: entry.previous.teamId,
            teamName,
          },
        });
        return;
      }

      if (entry.type === "result-added") {
        const teamName = teamById.get(entry.result.teamId) || "Unknown team";
        await onAuditLog({
          category: "result",
          action: "match_results_updated",
          message: `Added ${teamName} result to ${match.name}.`,
          metadata: {
            matchId: match.id,
            matchName: match.name,
            teamId: entry.result.teamId,
            teamName,
          },
        });
        return;
      }

      const teamNames = entry.results.map(
        (result) => teamById.get(result.teamId) || "Unknown team",
      );
      await onAuditLog({
        category: "result",
        action: "match_results_updated",
        message: `Added results to ${match.name}: ${teamNames.join(", ")}.`,
        metadata: { matchId: match.id, matchName: match.name, teamNames },
      });
    };

    if (context.type === "batch") {
      for (const entry of context.changes) {
        await logContext(entry);
      }
    } else {
      await logContext(context);
    }

    const liveMatch = matches.find((item) => item.id === match.id);
    if (liveMatch) {
      setViewResultsMatch({ ...liveMatch, results, status: "Completed" });
    }
  };

  const handleSaveMatch = async (updated: EditableMatch) => {
    const previousMatch = matches.find((match) => match.id === String(updated.id));
    await workspace.saveMatch({ ...updated, id: String(updated.id) });
    const changes = compactChanges([
      auditChange("name", "Match name", previousMatch?.name, updated.name),
      auditChange("map", "Map", previousMatch?.map, updated.map),
    ]);
    if (changes.length > 0) {
      await onAuditLog({
        category: "match",
        action: "match_updated",
        message: `Changed ${previousMatch?.name || updated.name}.`,
        changes,
        metadata: { matchId: String(updated.id), matchName: updated.name },
      });
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    const deletedMatch = matches.find((match) => match.id === matchId);
    await workspace.deleteMatch(matchId);
    if (resultsMatch?.id === matchId) setResultsMatch(null);
    if (viewResultsMatch?.id === matchId) {
      setViewResultsOpen(false);
      setViewResultsMatch(null);
    }
    if (editingMatch?.id === matchId) setEditingMatch(null);
    queue.add(
      {
        title: "Match deleted",
        description: "The match has been removed from this event.",
        variant: "success",
      },
      { timeout: 5000 },
    );
    if (deletedMatch) {
      await onAuditLog({
        category: "match",
        action: "match_deleted",
        message: `Deleted match ${deletedMatch.name}.`,
        metadata: { matchId, matchName: deletedMatch.name },
      });
    }
  };

  const handleExport = async (match: EventMatch, format: "image" | "excel") => {
    const live = matches.find((item) => item.id === match.id) ?? match;
    if (live.results.length === 0) {
      queue.add(
        {
          title: "Nothing to export",
          description: "Add results to this match before exporting.",
          variant: "error",
        },
        { timeout: 5000 },
      );
      return;
    }

    const progress = await beginExportProgress();
    try {
      if (format === "excel") {
        await exportMatchResultsToExcel(
          live,
          live.results,
          workspace.matchTeamsData,
          eventScoring,
          resolvedOrganizerName,
          resolvedEventName,
          progress.update,
        );
        progress.complete();
        void onAuditLog({
          category: "export",
          action: "match_results_excel_exported",
          message: `Exported ${live.name} results as Excel.`,
          metadata: { matchId: live.id, matchName: live.name, format: "excel" },
        });
        queue.add(
          { title: "Excel export ready", description: `${live.name} results have been downloaded.`, variant: "success" },
          { timeout: 5000 },
        );
        return;
      }
      await exportMatchResultsPlainImage(live, live.results, workspace.matchTeamsData, eventScoring, resolvedOrganizerName, resolvedEventName, progress.update);
      progress.complete();
      await onAuditLog({
        category: "export",
        action: "match_results_image_exported",
        message: `Quick exported ${live.name} results as image.`,
        metadata: { matchId: live.id, matchName: live.name, format: "image", mode: "quick" },
      });
      queue.add(
        {
          title: "Image export ready",
          description: `${live.name} results have been downloaded as PNG.`,
          variant: "success",
        },
        { timeout: 5000 },
      );
    } catch (error) {
      progress.dismiss();
      queue.add(
        {
          title: "Export failed",
          description:
            error instanceof Error ? error.message : "Could not export results. Please try again.",
          variant: "error",
        },
        { timeout: 5000 },
      );
    }
  };

  const activeResultsMatch = resultsMatch
    ? (matches.find((match) => match.id === resultsMatch.id) ?? resultsMatch)
    : null;

  const activeViewResultsMatch = viewResultsMatch
    ? (matches.find((match) => match.id === viewResultsMatch.id) ?? viewResultsMatch)
    : null;

  const openViewResults = (match: EventMatch) => {
    setViewResultsMatch(match);
    setViewResultsOpen(true);
  };

  const openMatchTemplateExport = (
    match: {
      id: string | number;
      name: string;
      map: string;
      status: "Pending Results" | "Completed";
      results: ResultEntry[];
    },
    results: ResultEntry[],
  ) => {
    const live = matches.find((item) => item.id === String(match.id));
    const exportMatch: EventMatch = live ?? {
      id: String(match.id),
      name: match.name,
      map: match.map,
      status: match.status,
      results,
      order: matches.length,
    };
    setMatchTemplateExport({ match: { ...exportMatch, results }, results });
  };

  const matchTemplateExportRows = matchTemplateExport
    ? buildMatchResultRows(matchTemplateExport.results, workspace.matchTeamsData, eventScoring).map(
        (row) => ({
          rank: row.rank,
          team: row.teamName,
          wins: row.position === 1 ? 1 : 0,
          positionPoints: row.placementPoints,
          killPoints: row.killPoints,
          totalPoints: row.totalPoints,
        }),
      )
    : [];
  const matchTemplateExportSequence = matchTemplateExport
    ? Math.max(1, matches.findIndex((match) => match.id === matchTemplateExport.match.id) + 1)
    : 1;
  const matchTemplateExportGame = workspace.event ? getEventGame(workspace.event).name : "";

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isAddOpen || isBulkOpen || resultsMatch || viewResultsOpen || editingMatch) return;
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;
      if (isTyping) return;

      const key = event.key.toLowerCase();
      if (!["n", "b"].includes(key)) return;

      event.preventDefault();
      if (key === "n") setIsAddOpen(true);
      if (key === "b") setIsBulkOpen(true);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isAddOpen, isBulkOpen, resultsMatch, viewResultsOpen, editingMatch]);

  return (
    <div className="mx-auto max-w-[1200px] h-full flex flex-col">
      {/* Top Section */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-[24px] font-semibold text-[#000000]">Matches</h2>
          <p className="mt-1 text-[14px] text-[#666666]">
            Create and manage matches for this event.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsBulkOpen(true)}
            className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[6px] border border-[#e2e5ec] bg-white px-4 text-[13px] font-medium text-[#000000] transition-colors hover:bg-[#f9fbfc]"
          >
            <Users className="h-4 w-4" />
            Bulk add
          </button>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[6px] bg-[#000000] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#333]"
          >
            <Plus className="h-4 w-4" /> Add Match
          </button>
        </div>
      </div>

      {/* Main Content */}
      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[12px] border border-[#e2e5ec] bg-white py-20">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-[#f0f1f3]">
            <Swords className="h-6 w-6 text-[#9aa1b0]" />
          </div>
          <h3 className="text-[16px] font-semibold text-[#000000]">No matches created yet</h3>
          <p className="mt-1.5 text-[14px] text-[#666666] text-center max-w-[320px]">
            Create your first match to start entering results and building the standings.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsBulkOpen(true)}
              className="flex cursor-pointer items-center gap-2 rounded-[6px] border border-[#e2e5ec] bg-white px-4 py-2 text-[13px] font-medium text-[#000000] hover:bg-[#f9fbfc]"
            >
              <Users className="h-4 w-4" />
              Bulk add
            </button>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="cursor-pointer rounded-[6px] bg-[#000000] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#333]"
            >
              Add Match
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {matches.map((m) => (
            <div
              key={m.id}
              className="rounded-[10px] border border-[#e2e5ec] bg-white p-5 flex flex-col transition-shadow"
            >
              <div className="mb-4 flex items-start justify-between">
                <h3 className="text-[16px] font-semibold text-[#000000]">{m.name}</h3>
                <MatchCardMenu
                  onExportExcel={() => void handleExport(m, "excel")}
                  onExportImage={() => void handleExport(m, "image")}
                  onDelete={() => setMatchPendingDelete(m)}
                />
              </div>
              <div className="space-y-2 mb-6 flex-1">
                <div className="flex items-center text-[13px]">
                  <span className="w-16 font-medium text-[#4b5563]">Map:</span>
                  <span className="text-[#000000] font-medium">{m.map}</span>
                </div>
                <div className="flex items-center text-[13px]">
                  <span className="w-16 font-medium text-[#4b5563]">Status:</span>
                  <span
                    className={`inline-flex whitespace-nowrap font-medium ${m.status === "Completed" ? "text-[#059669] bg-[#e2f5ec] px-2 py-0.5 rounded-full text-[11px]" : "text-[#d97706] bg-[#fef3c7] px-2 py-0.5 rounded-full text-[11px]"}`}
                  >
                    {m.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-auto">
                <button
                  type="button"
                  onClick={() => {
                    if (m.status === "Completed") openViewResults(m);
                    else setResultsMatch(m);
                  }}
                  className={`flex-1 cursor-pointer rounded-[6px] border py-1.5 text-[13px] font-medium transition-colors ${
                    m.status === "Completed"
                      ? "border-[#e2e5ec] bg-[#f9fbfc] text-[#000000] hover:bg-[#f7f8fb]"
                      : "border-transparent bg-[#000000] text-white hover:bg-[#333]"
                  }`}
                >
                  {m.status === "Completed" ? "View Results" : "Enter Results"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingMatch(m)}
                  className="cursor-pointer rounded-[6px] border border-[#e2e5ec] px-3 py-1.5 text-[13px] font-medium text-[#000000] transition-colors hover:bg-[#f9fbfc]"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddMatchModal
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onAddMatch={handleAddMatch}
        nextMatchNumber={matches.length + 1}
        mapOptions={matchMapOptions}
      />

      <BulkAddMatchesModal
        open={isBulkOpen}
        onOpenChange={setIsBulkOpen}
        onAddMatches={handleAddMatches}
        nextMatchNumber={matches.length + 1}
        mapOptions={matchMapOptions}
      />

      <MatchResultsModal
        open={resultsMatch !== null}
        onClose={() => setResultsMatch(null)}
        match={activeResultsMatch}
        teams={workspace.matchTeamsData}
        onUpdateResults={handleUpdateMatchResults}
        onMarkCompleted={handleMarkMatchCompleted}
      />

      <ViewMatchResultsModal
        open={viewResultsOpen}
        match={activeViewResultsMatch}
        teams={workspace.matchTeamsData}
        scoring={eventScoring}
        organizerName={resolvedOrganizerName}
        eventName={resolvedEventName}
        onQuickExportImage={(m) => handleExport(m as EventMatch, "image")}
        onExport={(format, match) =>
          onAuditLog({
            category: "export",
            action:
              format === "excel" ? "match_results_excel_exported" : "match_results_image_exported",
            message: `Exported ${match.name} results as ${format === "excel" ? "Excel" : "image"}.`,
            metadata: { matchId: match.id, matchName: match.name, format },
          })
        }
        onTemplateImageExport={openMatchTemplateExport}
        onSaveResults={handleSaveViewedMatchResults}
        onOpenChange={(open) => {
          setViewResultsOpen(open);
          if (!open) {
            window.setTimeout(() => setViewResultsMatch(null), VIEW_MATCH_RESULTS_CLOSE_MS);
          }
        }}
      />

      <StandingsTemplateExportModal
        open={matchTemplateExport !== null}
        onOpenChange={(open) => {
          if (!open) setMatchTemplateExport(null);
        }}
        leaderboardType="points"
        pointRows={matchTemplateExportRows}
        fraggerRows={[]}
        teams={workspace.eventTeams}
        eventName={workspace.event?.name || ""}
        eventGameName={matchTemplateExportGame}
        exportView="single-match"
        selectedMatchNumber={matchTemplateExportSequence}
        selectedMatchMap={matchTemplateExport?.match.map || ""}
        exportMatches={matches.map((match, index) => ({
          number: index + 1,
          name: match.name,
          map: match.map,
        }))}
      />

      <EditMatchModal
        open={editingMatch !== null}
        match={editingMatch}
        onOpenChange={(open) => {
          if (!open) setEditingMatch(null);
        }}
        onSave={handleSaveMatch}
        mapOptions={matchMapOptions}
      />

      <ThemedConfirmDialog
        open={matchPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setMatchPendingDelete(null);
        }}
        title="Delete match?"
        description={
          matchPendingDelete
            ? `${matchPendingDelete.name} and its results will be permanently removed from this event.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (!matchPendingDelete) return;
          void handleDeleteMatch(matchPendingDelete.id).then(() => {
            setMatchPendingDelete(null);
          }).catch((error) => {
            queue.add(
              {
                title: "Could not delete match",
                description: error instanceof Error ? error.message : "Please try again.",
                variant: "error",
              },
              { timeout: 5000 },
            );
          });
        }}
      />
    </div>
  );
}

function StandingsTab({
  event,
  eventId,
  leaderboard,
  matches,
  teams,
  scoringRule,
  onRefresh,
  onEnterResults,
  onAuditLog,
}: {
  event: ApiEvent | null;
  eventId: string;
  leaderboard: import("@/lib/api").ApiLeaderboardRow[];
  matches: WorkspaceMatch[];
  teams: ApiTeam[];
  scoringRule?: ApiEvent["scoringRuleId"];
  onRefresh: () => void | Promise<void>;
  onEnterResults: () => void;
  onAuditLog: AuditLogger;
}) {
  const [view, setView] = useState<"overall" | "single-match" | "till-match">("overall");
  const [leaderboardType, setLeaderboardType] = useState<"points" | "fraggers">("points");
  const [selectedMatchNumber, setSelectedMatchNumber] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [backendPointRows, setBackendPointRows] = useState<
    import("@/lib/api").ApiStandingsPointRow[]
  >([]);
  const [backendFraggerRows, setBackendFraggerRows] = useState<
    import("@/lib/api").ApiStandingsFraggerRow[]
  >([]);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [templateExportOpen, setTemplateExportOpen] = useState(false);

  const activeScoringRule =
    scoringRule && typeof scoringRule !== "string" ? (scoringRule as ApiScoringRule) : null;
  const placementPoints = placementMapToArray(activeScoringRule?.placementPoints, 0);
  const killPointValue = activeScoringRule?.killPoints ?? 1;
  const teamMap = new Map(teams.map((team) => [team._id, team]));
  const playerNameById = new Map<string, string>();
  teams.forEach((team) => {
    team.players?.forEach((player) => {
      playerNameById.set(player.playerId || player.name, player.name);
    });
  });

  const matchResults = matches
    .filter((match) => match.status === "Completed" && match.results.length > 0)
    .map((match, index) => ({
      number: index + 1,
      name: match.name,
      map: match.map,
      rows: match.results
        .filter((result) => result.teamId && teamMap.has(result.teamId) && result.position !== "")
        .map((result) => {
          const team = teamMap.get(result.teamId);
          const position = Number(result.position);
          const kills = Number(result.totalKills || 0);
          return {
            team: team?.name || "Unknown team",
            position,
            positionPoints: placementPoints[position - 1] ?? 0,
            killPoints: kills * killPointValue,
            frags: Object.entries(result.playerKills || {})
              .map(([playerId, value]) => ({
                player: playerNameById.get(playerId) || playerId,
                kills: typeof value === "number" ? value : Number(value) || 0,
              }))
              .filter((frag) => frag.kills > 0),
          };
        })
        .sort((a, b) => a.position - b.position),
    }));

  useEffect(() => {
    if (matchResults.length === 0) return;
    if (!matchResults.some((match) => match.number === selectedMatchNumber)) {
      setSelectedMatchNumber(matchResults[0].number);
    }
  }, [matchResults, selectedMatchNumber]);

  const buildLeaderboard = (matchLimit: number) => {
    const totals = new Map<
      string,
      {
        team: string;
        matchesPlayed: number;
        wins: number;
        positionPoints: number;
        killPoints: number;
      }
    >();

    matchResults
      .filter((match) => match.number <= matchLimit)
      .forEach((match) => {
        match.rows.forEach((row) => {
          const teamTotal = totals.get(row.team) ?? {
            team: row.team,
            matchesPlayed: 0,
            wins: 0,
            positionPoints: 0,
            killPoints: 0,
          };

          teamTotal.matchesPlayed += 1;
          teamTotal.wins += row.position === 1 ? 1 : 0;
          teamTotal.positionPoints += row.positionPoints;
          teamTotal.killPoints += row.killPoints;
          totals.set(row.team, teamTotal);
        });
      });

    return Array.from(totals.values())
      .map((row) => ({
        ...row,
        totalPoints: row.positionPoints + row.killPoints,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints || b.wins - a.wins)
      .map((row, index) => ({ ...row, rank: index + 1 }));
  };

  const buildFraggerLeaderboard = (matchLimit: number) => {
    const totals = new Map<
      string,
      {
        player: string;
        team: string;
        matchesPlayed: number;
        kills: number;
      }
    >();

    matchResults
      .filter((match) => match.number <= matchLimit)
      .forEach((match) => {
        match.rows.forEach((teamRow) => {
          teamRow.frags.forEach((frag) => {
            const key = `${teamRow.team}-${frag.player}`;
            const playerTotal = totals.get(key) ?? {
              player: frag.player,
              team: teamRow.team,
              matchesPlayed: 0,
              kills: 0,
            };

            playerTotal.matchesPlayed += 1;
            playerTotal.kills += frag.kills;
            totals.set(key, playerTotal);
          });
        });
      });

    return Array.from(totals.values())
      .map((row) => ({
        ...row,
        averageKills: Number((row.kills / row.matchesPlayed).toFixed(1)),
      }))
      .sort((a, b) => b.kills - a.kills || b.averageKills - a.averageKills)
      .map((row, index) => ({ ...row, rank: index + 1 }));
  };

  const selectedMatch =
    matchResults.find((match) => match.number === selectedMatchNumber) ?? matchResults[0];
  const tillMatchLimit = selectedMatch?.number ?? 0;

  useEffect(() => {
    setBackendPointRows([]);
    setBackendFraggerRows([]);
    setStandingsLoading(false);
  }, [view, leaderboardType, selectedMatchNumber, selectedMatch]);

  const overallRows = buildLeaderboard(matchResults.length);
  const tillMatchRows = buildLeaderboard(tillMatchLimit);
  const singleMatchRows = (selectedMatch?.rows ?? [])
    .map((row) => ({
      team: row.team,
      matchesPlayed: 1,
      wins: row.position === 1 ? 1 : 0,
      position: row.position,
      positionPoints: row.positionPoints,
      killPoints: row.killPoints,
      totalPoints: row.positionPoints + row.killPoints,
    }))
    .sort((a, b) => a.position - b.position)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const overallFraggerRows = buildFraggerLeaderboard(matchResults.length);
  const tillMatchFraggerRows = buildFraggerLeaderboard(tillMatchLimit);
  const singleMatchFraggerRows = (selectedMatch?.rows ?? [])
    .flatMap((teamRow) =>
      teamRow.frags.map((frag) => ({
        player: frag.player,
        team: teamRow.team,
        matchesPlayed: 1,
        kills: frag.kills,
        averageKills: frag.kills,
      })),
    )
    .sort((a, b) => b.kills - a.kills)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const apiOverallRows = leaderboard
    .filter((row) => row.team?._id && teamMap.has(row.team._id))
    .map((row, index) => ({
      rank: index + 1,
      team: row.team.name,
      matchesPlayed: row.totalMatches,
      wins: row.wwcd,
      positionPoints: row.positionPoints,
      killPoints: row.killPoints,
      totalPoints: row.totalPoints,
    }));

  const activeRows =
    view === "overall" ? apiOverallRows : view === "single-match" ? singleMatchRows : tillMatchRows;
  const activeFraggerRows =
    view === "overall"
      ? overallFraggerRows
      : view === "single-match"
        ? singleMatchFraggerRows
        : tillMatchFraggerRows;

  const hasStandings =
    leaderboardType === "points" ? activeRows.length > 0 : activeFraggerRows.length > 0;

  const handleExportExcel = async () => {
    if (isExportingExcel) return;
    if (!hasStandings) {
      queue.add(
        {
          title: "Nothing to export",
          description: "There are no standings for this selection yet.",
          variant: "error",
        },
        { timeout: 4000 },
      );
      return;
    }

    setIsExportingExcel(true);
    const progress = await beginExportProgress();
    try {
      const selectedMatchLabel = selectedMatch
        ? selectedMatch.map
          ? `${selectedMatch.name} · ${selectedMatch.map}`
          : selectedMatch.name
        : "—";
      await exportStandingsToExcel({
        mode: leaderboardType === "points" ? "points" : "shooters",
        scope: view,
        eventName: event?.name || "Tournament",
        selectedMatchLabel,
        pointRows: activeRows.map((row) => ({
          rank: row.rank,
          team: row.team,
          position: "position" in row ? Number(row.position) : "—",
          matchesPlayed: row.matchesPlayed,
          wins: row.wins,
          positionPoints: row.positionPoints,
          killPoints: row.killPoints,
          totalPoints: row.totalPoints,
        })),
        shooterRows: activeFraggerRows.map((row) => ({
          rank: row.rank,
          player: row.player,
          team: row.team,
          matchesPlayed: row.matchesPlayed,
          kills: row.kills,
          averageKills: row.averageKills,
        })),
        onProgress: progress.update,
      });
      progress.complete();
      void onAuditLog({
        category: "export",
        action: "standings_excel_exported",
        message: `Exported ${leaderboardType === "points" ? "points table" : "top shooters"} for ${view === "overall" ? "overall standings" : `${view === "single-match" ? "single match" : "standings through"} ${selectedMatchLabel}`} as Excel.`,
        metadata: {
          eventId,
          eventName: event?.name || "Tournament",
          leaderboardType,
          scope: view,
          selectedMatch: view === "overall" ? null : selectedMatchLabel,
          rowCount: leaderboardType === "points" ? activeRows.length : activeFraggerRows.length,
          format: "excel",
        },
      }).catch((error) => console.error("Could not record standings export", error));
      queue.add(
        {
          title: "Standings export ready",
          description: "Your standings spreadsheet has been downloaded.",
          variant: "success",
        },
        { timeout: 4000 },
      );
    } catch (error) {
      progress.dismiss();
      queue.add(
        {
          title: "Standings export failed",
          description: error instanceof Error ? error.message : "Could not export the standings. Please try again.",
          variant: "error",
        },
        { timeout: 5000 },
      );
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (err) {
      queue.add(
        {
          title: "Could not refresh standings",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "error",
        },
        { timeout: 4000 },
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="mx-auto flex h-full max-w-[1200px] flex-col">
      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <h2 className="text-[24px] font-semibold text-[#000000]">Standings</h2>
          <p className="mt-1 text-[14px] text-[#666666]">Overall points table for this event.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[6px] border border-[#e2e5ec] bg-white px-4 text-[13px] font-medium text-[#000000] transition-colors hover:bg-[#f9fbfc] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh / Recalculate"}
          </button>
          <AppDropdownMenu
            widthClass="w-[170px]"
            trigger={
              <button className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[6px] bg-[#000000] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#333]">
                <FileDown className="h-4 w-4" />
                Export
                <ChevronDown className="h-3.5 w-3.5 text-white/70" />
              </button>
            }
            items={[
              {
                label: "Image",
                icon: <ImageIcon className="h-4 w-4" />,
                onSelect: () => window.setTimeout(() => setTemplateExportOpen(true), 0),
              },
              {
                label: "Excel",
                icon: <FileSpreadsheet className="h-4 w-4" />,
                onSelect: () => void handleExportExcel(),
              },
            ]}
          />
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex w-fit items-center rounded-[8px] bg-[#eef0f4] p-1">
          {[
            { id: "points", label: "Points Table" },
            { id: "fraggers", label: "Top Shooters" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setLeaderboardType(tab.id as "points" | "fraggers")}
              className={`cursor-pointer rounded-[6px] px-4 py-1.5 text-[13px] font-medium transition-all ${
                leaderboardType === tab.id
                  ? "bg-white text-[#000000] shadow-sm"
                  : "text-[#666666] hover:text-[#000000]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="inline-flex w-fit items-center rounded-[8px] bg-[#eef0f4] p-1">
          {[
            { id: "overall", label: "Overall" },
            { id: "single-match", label: "Single match" },
            { id: "till-match", label: "Till match" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id as "overall" | "single-match" | "till-match")}
              className={`cursor-pointer rounded-[6px] px-4 py-1.5 text-[13px] font-medium transition-all ${
                view === tab.id
                  ? "bg-white text-[#000000] shadow-sm"
                  : "text-[#666666] hover:text-[#000000]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {view !== "overall" && (
          <motion.div
            key="standings-match-selector"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-visible"
          >
            <div className="mb-5 flex items-center gap-3">
              <span className="text-[13px] font-medium text-[#4b5563]">
                {view === "single-match" ? "Show match" : "Calculate till"}
              </span>
              <AppSelect
                value={String(selectedMatchNumber)}
                onChange={(value) => setSelectedMatchNumber(Number(value))}
                options={matchResults.map((match) => ({
                  label: match.map ? `${match.name} · ${match.map}` : match.name,
                  value: String(match.number),
                }))}
                className="w-[260px]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        {standingsLoading ? (
          <motion.div
            key="standings-loading"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-1 flex-col items-center justify-center rounded-[12px] border border-dashed border-[#d1d5db] bg-white px-6 py-20 text-center"
          >
            <GlobalPageLoader label="Loading standings" variant="section" />
          </motion.div>
        ) : !hasStandings ? (
          <motion.div
            key={`standings-empty-${leaderboardType}-${view}-${selectedMatchNumber}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-1 flex-col items-center justify-center rounded-[12px] border border-dashed border-[#d1d5db] bg-white px-6 py-20 text-center"
          >
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-[#f0f1f3]">
              <Trophy className="h-6 w-6 text-[#9aa1b0]" />
            </div>
            <h3 className="text-[17px] font-semibold text-[#000000]">No standings yet</h3>
            <p className="mt-2 max-w-[360px] text-[14px] text-[#666666]">
              Enter results for at least one match to generate the points table.
            </p>
            <button
              onClick={onEnterResults}
              className="mt-6 rounded-[6px] bg-[#000000] px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#333]"
            >
              Enter Results
            </button>
          </motion.div>
        ) : leaderboardType === "points" ? (
          <motion.div
            key={`standings-points-${view}-${selectedMatchNumber}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden rounded-[10px] border border-[#e2e5ec] bg-white"
          >
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-[#e2e5ec] bg-[#f9fbfc]">
                <tr>
                  <th className="w-[90px] px-6 py-3 font-medium uppercase tracking-wider text-[#4b5563]">
                    Rank
                  </th>
                  <th className="px-6 py-3 font-medium uppercase tracking-wider text-[#4b5563]">
                    Team
                  </th>
                  {view === "single-match" && (
                    <th className="px-6 py-3 text-right font-medium uppercase tracking-wider text-[#4b5563]">
                      Position
                    </th>
                  )}
                  <th className="px-6 py-3 text-right font-medium uppercase tracking-wider text-[#4b5563]">
                    Matches Played
                  </th>
                  <th className="px-6 py-3 text-right font-medium uppercase tracking-wider text-[#4b5563]">
                    Wins
                  </th>
                  <th className="px-6 py-3 text-right font-medium uppercase tracking-wider text-[#4b5563]">
                    Position Points
                  </th>
                  <th className="px-6 py-3 text-right font-medium uppercase tracking-wider text-[#4b5563]">
                    Kill Points
                  </th>
                  <th className="px-6 py-3 text-right font-medium uppercase tracking-wider text-[#4b5563]">
                    Total Points
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f1f3]">
                {activeRows.map((team) => (
                  <tr key={team.rank} className="hover:bg-[#fcfdfd]">
                    <td className="px-6 py-4 text-[14px] font-semibold text-[#000000]">
                      #{team.rank}
                    </td>
                    <td className="px-6 py-4 text-[14px] font-semibold text-[#000000]">
                      {team.team}
                    </td>
                    {view === "single-match" && (
                      <td className="px-6 py-4 text-right text-[#4b5563]">
                        {"position" in team ? (team.position as number | string) : "-"}
                      </td>
                    )}
                    <td className="px-6 py-4 text-right text-[#4b5563]">{team.matchesPlayed}</td>
                    <td className="px-6 py-4 text-right text-[#4b5563]">{team.wins}</td>
                    <td className="px-6 py-4 text-right text-[#4b5563]">{team.positionPoints}</td>
                    <td className="px-6 py-4 text-right text-[#4b5563]">{team.killPoints}</td>
                    <td className="px-6 py-4 text-right text-[15px] font-semibold text-[#000000]">
                      {team.totalPoints}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        ) : (
          <motion.div
            key={`standings-fraggers-${view}-${selectedMatchNumber}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden rounded-[10px] border border-[#e2e5ec] bg-white"
          >
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-[#e2e5ec] bg-[#f9fbfc]">
                <tr>
                  <th className="w-[90px] px-6 py-3 font-medium uppercase tracking-wider text-[#4b5563]">
                    Rank
                  </th>
                  <th className="px-6 py-3 font-medium uppercase tracking-wider text-[#4b5563]">
                    Player
                  </th>
                  <th className="px-6 py-3 font-medium uppercase tracking-wider text-[#4b5563]">
                    Team
                  </th>
                  <th className="px-6 py-3 text-right font-medium uppercase tracking-wider text-[#4b5563]">
                    Matches Played
                  </th>
                  <th className="px-6 py-3 text-right font-medium uppercase tracking-wider text-[#4b5563]">
                    Kills
                  </th>
                  <th className="px-6 py-3 text-right font-medium uppercase tracking-wider text-[#4b5563]">
                    Avg Kills
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f1f3]">
                {activeFraggerRows.map((player) => (
                  <tr
                    key={`${player.rank}-${player.team}-${player.player}`}
                    className="hover:bg-[#fcfdfd]"
                  >
                    <td className="px-6 py-4 text-[14px] font-semibold text-[#000000]">
                      #{player.rank}
                    </td>
                    <td className="px-6 py-4 text-[14px] font-semibold text-[#000000]">
                      {player.player}
                    </td>
                    <td className="px-6 py-4 text-[#4b5563]">{player.team}</td>
                    <td className="px-6 py-4 text-right text-[#4b5563]">{player.matchesPlayed}</td>
                    <td className="px-6 py-4 text-right text-[15px] font-semibold text-[#000000]">
                      {player.kills}
                    </td>
                    <td className="px-6 py-4 text-right text-[#4b5563]">{player.averageKills}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>

      <StandingsTemplateExportModal
        open={templateExportOpen}
        onOpenChange={setTemplateExportOpen}
        leaderboardType={leaderboardType}
        pointRows={leaderboardType === "points" ? activeRows : []}
        fraggerRows={leaderboardType === "fraggers" ? activeFraggerRows : []}
        teams={teams}
        eventName={event?.name || ""}
        eventGameName={event ? getEventGame(event).name : ""}
        exportView={view}
        selectedMatchNumber={selectedMatch?.number ?? selectedMatchNumber}
        selectedMatchMap={selectedMatch?.map || ""}
        exportMatches={matchResults.map((match) => ({
          number: match.number,
          name: match.name,
          map: match.map,
        }))}
      />
    </div>
  );
}

type StandingsPointExportRow = {
  rank: number;
  team: string;
  matchesPlayed: number;
  wins: number;
  positionPoints: number;
  killPoints: number;
  totalPoints: number;
};

type StandingsFraggerExportRow = {
  rank: number;
  player: string;
  team: string;
  matchesPlayed: number;
  kills: number;
  averageKills: number;
};

function textValue(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") {
    const maybeNamed = value as { name?: unknown; team?: unknown; player?: unknown };
    return textValue(maybeNamed.name ?? maybeNamed.team ?? maybeNamed.player, fallback);
  }
  return String(value);
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function versionedProfileImageUrl(src: string | null, version?: string | null) {
  if (!src || src.startsWith("data:") || src.startsWith("blob:") || !version) return src;
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}v=${encodeURIComponent(version)}`;
}

const TRANSPARENT_EXPORT_IMAGE_PLACEHOLDER =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

async function waitForTemplateAssets(node: HTMLElement) {
  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready.catch(() => undefined);
  }

  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
      });
    }),
  );
}

function sanitizeBrokenExportImages(node: HTMLElement) {
  Array.from(node.querySelectorAll("img")).forEach((image) => {
    if (image.naturalWidth > 0 && image.naturalHeight > 0) return;
    image.removeAttribute("srcset");
    image.src = TRANSPARENT_EXPORT_IMAGE_PLACEHOLDER;
  });
}

type StandingsExportTemplateOption = {
  id: string;
  name: string;
  category: string;
  format: string;
  previewUrl: string;
  tags: string[];
};

const DEMO_AUTUMN_ROWS: AutumnSeasonTemplateRow[] = [
  { rank: 1, team: "Nexus", wins: 3, killPoints: 44, placementPoints: 58, totalPoints: 102 },
  { rank: 2, team: "Raven Core", wins: 2, killPoints: 42, placementPoints: 51, totalPoints: 93 },
  { rank: 3, team: "Void Kings", wins: 2, killPoints: 39, placementPoints: 48, totalPoints: 87 },
  { rank: 4, team: "Apex Union", wins: 1, killPoints: 38, placementPoints: 44, totalPoints: 82 },
  { rank: 5, team: "Orbital", wins: 1, killPoints: 36, placementPoints: 42, totalPoints: 78 },
  { rank: 6, team: "Nova Vanguard", wins: 1, killPoints: 34, placementPoints: 40, totalPoints: 74 },
  { rank: 7, team: "Spectra", wins: 0, killPoints: 33, placementPoints: 38, totalPoints: 71 },
  { rank: 8, team: "Trident", wins: 1, killPoints: 31, placementPoints: 37, totalPoints: 68 },
  { rank: 9, team: "Iron Valkyrie", wins: 0, killPoints: 30, placementPoints: 35, totalPoints: 65 },
  { rank: 10, team: "Echo Crew", wins: 0, killPoints: 28, placementPoints: 34, totalPoints: 62 },
  { rank: 11, team: "Primeforce", wins: 0, killPoints: 26, placementPoints: 32, totalPoints: 58 },
  { rank: 12, team: "Wildkard", wins: 0, killPoints: 24, placementPoints: 31, totalPoints: 55 },
  { rank: 13, team: "Frostbite", wins: 0, killPoints: 23, placementPoints: 29, totalPoints: 52 },
  { rank: 14, team: "Razor Army", wins: 0, killPoints: 21, placementPoints: 26, totalPoints: 47 },
  { rank: 15, team: "Blaze Syndicate", wins: 0, killPoints: 19, placementPoints: 24, totalPoints: 43 },
  { rank: 16, team: "Gravity", wins: 0, killPoints: 17, placementPoints: 22, totalPoints: 39 },
];

function StandingsTemplateExportModal({
  open,
  onOpenChange,
  leaderboardType,
  pointRows,
  fraggerRows,
  teams,
  eventName,
  eventGameName,
  exportView: _exportView,
  selectedMatchNumber: _selectedMatchNumber,
  selectedMatchMap: _selectedMatchMap,
  exportMatches: _exportMatches,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaderboardType: "points" | "fraggers";
  pointRows: unknown[];
  fraggerRows: unknown[];
  teams: ApiTeam[];
  eventName: string;
  eventGameName: string;
  exportView: StandingsExportView;
  selectedMatchNumber: number;
  selectedMatchMap: string;
  exportMatches: Array<{ number: number; name: string; map: string }>;
}) {
  const [allTemplates, setAllTemplates] = useState<StandingsExportTemplateOption[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const requiredTemplateTag = leaderboardType === "points" ? "Point Table" : "Top Shooters";
  const availableTemplates = useMemo(
    () =>
      allTemplates.filter((template) =>
        template.tags.some((tag) => tag.trim().toLowerCase() === requiredTemplateTag.toLowerCase()),
      ),
    [allTemplates, requiredTemplateTag],
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [step, setStep] = useState<"select" | "edit">("select");
  const [stepDirection, setStepDirection] = useState<1 | -1>(1);

  // Sliders: Hue (0-360), Brightness (50-150), Contrast (50-150), Saturation (0-200)
  const [filterHue, setFilterHue] = useState<number>(0);
  const [filterBrightness, setFilterBrightness] = useState<number>(100);
  const [filterContrast, setFilterContrast] = useState<number>(100);
  const [filterSaturation, setFilterSaturation] = useState<number>(100);

  // Editable Event Name
  const [displayEventName, setDisplayEventName] = useState<string>(
    eventName || "Grand Arena Championship",
  );
  const [exporting, setExporting] = useState<boolean>(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Fetch the shared MongoDB template catalog when the export picker opens.
  useEffect(() => {
    if (!open) return;
    let active = true;
    setTemplatesLoading(true);
    templatesApi
      .getAll()
      .then((templates) => {
        if (!active) return;
        setAllTemplates(templates.map((template) => ({ ...template, tags: template.tags || [] })));
      })
      .catch((error) => {
        console.error("Failed to load export templates", error);
        if (active) {
          queue.add(
            { title: "Templates could not be loaded", description: "Please close the export window and try again.", variant: "error" },
            { timeout: 5000 },
          );
        }
      })
      .finally(() => {
        if (active) setTemplatesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (availableTemplates.some((template) => template.id === selectedTemplateId)) return;
    setSelectedTemplateId(availableTemplates[0]?.id ?? "");
  }, [availableTemplates, selectedTemplateId]);

  // Sync event name and initial state on open
  useEffect(() => {
    if (!open) return;
    setDisplayEventName(eventName || "Grand Arena Championship");
    setStep("select");
    setStepDirection(1);
  }, [eventName, open]);

  // Team Logo Lookup Map
  const teamLogoByName = useMemo(() => {
    const lookup = new Map<string, string>();
    teams.forEach((team) => {
      if (team.name && team.logoUrl) {
        lookup.set(team.name.trim().toLowerCase(), team.logoUrl);
      }
    });
    return lookup;
  }, [teams]);

  // Point Rows
  const previewPointRows = useMemo(() => {
    return (Array.isArray(pointRows) ? pointRows : []).slice(0, 16).map((input) => {
      const row = objectValue(input);
      const teamName = textValue(row.team, "Unknown team");
      return {
        rank: numberValue(row.rank),
        team: teamName,
        teamLogoSrc:
          textValue(row.teamLogoSrc, "") || teamLogoByName.get(teamName.trim().toLowerCase()) || null,
        matchesPlayed: numberValue(row.matchesPlayed),
        wins: numberValue(row.wins),
        positionPoints: numberValue(row.positionPoints),
        killPoints: numberValue(row.killPoints),
        totalPoints: numberValue(row.totalPoints),
      };
    });
  }, [pointRows, teamLogoByName]);

  // Fragger Rows
  const previewFraggerRows = useMemo(() => {
    return (Array.isArray(fraggerRows) ? fraggerRows : []).slice(0, 16).map((input) => {
      const row = objectValue(input);
      return {
        rank: numberValue(row.rank),
        player: textValue(row.player, "Unknown player"),
        team: textValue(row.team, "Unknown team"),
        matchesPlayed: numberValue(row.matchesPlayed),
        kills: numberValue(row.kills),
        averageKills: numberValue(row.averageKills),
      };
    });
  }, [fraggerRows]);

  // Final Autumn rows passed to the renderer
  const autumnRows: AutumnSeasonTemplateRow[] = useMemo(() => {
    if (leaderboardType === "points") {
      if (previewPointRows.length > 0) {
        return previewPointRows.map((row) => ({
          rank: row.rank,
          team: row.team,
          teamLogoSrc: row.teamLogoSrc,
          wins: row.wins,
          killPoints: row.killPoints,
          placementPoints: row.positionPoints,
          totalPoints: row.totalPoints,
        }));
      }
      if (teams && teams.length > 0) {
        return teams.slice(0, 16).map((team, idx) => ({
          rank: idx + 1,
          team: team.name,
          teamLogoSrc: team.logoUrl || null,
          wins: 0,
          killPoints: 0,
          placementPoints: 0,
          totalPoints: 0,
        }));
      }
    } else {
      if (previewFraggerRows.length > 0) {
        return previewFraggerRows.map((row) => ({
          rank: row.rank,
          team: row.player,
          teamLogoSrc: null,
          wins: row.matchesPlayed,
          killPoints: row.kills,
          placementPoints: row.averageKills,
          totalPoints: row.kills,
        }));
      }
    }
    return DEMO_AUTUMN_ROWS;
  }, [leaderboardType, previewPointRows, previewFraggerRows, teams]);

  const anyTeamHasLogo = useMemo(() => {
    return autumnRows.some((row) => Boolean(row.team && row.teamLogoSrc && String(row.teamLogoSrc).trim()));
  }, [autumnRows]);

  const autumnTopShooterRows: TopShooterItem[] = useMemo(() => {
    if (previewFraggerRows.length > 0) {
      return previewFraggerRows.slice(0, 5).map((row) => {
        const teamName = row.team;
        const logo = teamLogoByName.get(teamName.trim().toLowerCase()) || null;
        return {
          rank: row.rank,
          player: row.player,
          team: row.team,
          teamLogoSrc: logo,
          kills: row.kills,
        };
      });
    }
    if (previewPointRows.length > 0) {
      return previewPointRows.slice(0, 5).map((row) => ({
        rank: row.rank,
        player: row.team,
        team: row.team,
        teamLogoSrc: row.teamLogoSrc,
        kills: row.killPoints,
      }));
    }
    return [];
  }, [previewFraggerRows, previewPointRows, teamLogoByName]);

  // Export full-resolution PNG
  const handleExportImage = async () => {
    if (!exportRef.current || exporting) return;
    setExporting(true);
    const progress = await beginExportProgress();
    try {
      progress.update(10);
      const { toPng } = await import("html-to-image");
      progress.update(20);
      await waitForTemplateAssets(exportRef.current);
      sanitizeBrokenExportImages(exportRef.current);
      progress.update(35);

      const targetWidth =
        selectedTemplateId === "general-template-1"
          ? GENERAL_TEMPLATE_1_WIDTH
          : selectedTemplateId === "general-template-2"
            ? GENERAL_TEMPLATE_2_WIDTH
            : selectedTemplateId === "general-template-3"
              ? GENERAL_TEMPLATE_3_WIDTH
              : selectedTemplateId === "free-fire-theme-template"
                ? FREE_FIRE_TEMPLATE_WIDTH
                : selectedTemplateId === "autumn-top-shooters-template"
                  ? TOP_SHOOTERS_AUTUMN_WIDTH
                  : selectedTemplateId === "general-1-top-shooters-template"
                    ? TOP_SHOOTERS_GENERAL1_WIDTH
                    : selectedTemplateId === "general-2-top-shooters-template"
                      ? TOP_SHOOTERS_GENERAL2_WIDTH
                      : AUTUMN_TEMPLATE_WIDTH;
      const targetHeight =
        selectedTemplateId === "general-template-1"
          ? GENERAL_TEMPLATE_1_HEIGHT
          : selectedTemplateId === "general-template-2"
            ? GENERAL_TEMPLATE_2_HEIGHT
            : selectedTemplateId === "general-template-3"
              ? GENERAL_TEMPLATE_3_HEIGHT
              : selectedTemplateId === "free-fire-theme-template"
                ? FREE_FIRE_TEMPLATE_HEIGHT
                : selectedTemplateId === "autumn-top-shooters-template"
                  ? TOP_SHOOTERS_AUTUMN_HEIGHT
                  : selectedTemplateId === "general-1-top-shooters-template"
                    ? TOP_SHOOTERS_GENERAL1_HEIGHT
                    : selectedTemplateId === "general-2-top-shooters-template"
                      ? TOP_SHOOTERS_GENERAL2_HEIGHT
                      : AUTUMN_TEMPLATE_HEIGHT;

      const dataUrl = await toPng(exportRef.current, {
        width: targetWidth,
        height: targetHeight,
        pixelRatio: 2,
        cacheBust: true,
        imagePlaceholder: TRANSPARENT_EXPORT_IMAGE_PLACEHOLDER,
      });
      progress.update(90);

      const link = document.createElement("a");
      link.href = dataUrl;
      const safeEventName = (displayEventName || "Tournament")
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, "_");
      link.download = `${safeEventName}_Standings.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      progress.complete();

      queue.add(
        {
          title: "Image export complete",
          description: "Your standings image has been downloaded.",
          variant: "success",
        },
        { timeout: 4000 },
      );
    } catch (error) {
      progress.dismiss();
      console.error("Image export failed", error);
      queue.add(
        {
          title: "Image export failed",
          description:
            error instanceof Error
              ? error.message
              : String(error || "Could not generate the PNG. Please try again."),
          variant: "error",
        },
        { timeout: 6000 },
      );
    } finally {
      setExporting(false);
    }
  };

  const handleResetAdjustments = () => {
    setFilterHue(0);
    setFilterBrightness(100);
    setFilterContrast(100);
    setFilterSaturation(100);
  };

  const handleResetAll = () => {
    handleResetAdjustments();
    setDisplayEventName(eventName || "Grand Arena Championship");
  };

  return (
    <AppPopupWindow
      open={open}
      onOpenChange={onOpenChange}
      title="Export standings image"
      description="Preview and customize your standings template before exporting."
      className="h-[88vh] w-[95vw] max-w-[1360px]"
      bodyClassName="min-h-0 overflow-hidden p-0"
      footer={
        step === "select" ? (
          <>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-[38px] cursor-pointer rounded-[8px] border border-[#e2e5ec] px-5 text-[13px] font-medium text-[#000000] hover:bg-[#f7f8fb]"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                setStepDirection(1);
                setStep("edit");
              }}
              disabled={templatesLoading || !selectedTemplateId}
              className="h-[38px] cursor-pointer rounded-[8px] border border-[#e2e5ec] px-5 text-[13px] font-medium text-[#000000] hover:bg-[#f7f8fb] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleExportImage}
              disabled={exporting || templatesLoading || !selectedTemplateId}
              className="h-[38px] cursor-pointer rounded-[8px] bg-[#000000] px-6 text-[13px] font-medium text-white hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {exporting ? "Exporting..." : "Export"}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setStepDirection(-1);
                setStep("select");
              }}
              className="h-[38px] cursor-pointer rounded-[8px] border border-[#e2e5ec] px-5 text-[13px] font-medium text-[#000000] hover:bg-[#f7f8fb]"
            >
              Back to Templates
            </button>
            <button
              type="button"
              onClick={handleResetAll}
              className="h-[38px] cursor-pointer rounded-[8px] border border-[#e2e5ec] px-4 text-[13px] font-medium text-[#4b5563] hover:bg-[#f7f8fb]"
            >
              Reset All
            </button>
            <button
              type="button"
              onClick={handleExportImage}
              disabled={exporting || templatesLoading || !selectedTemplateId}
              className="h-[38px] cursor-pointer rounded-[8px] bg-[#000000] px-6 text-[13px] font-medium text-white hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {exporting ? "Exporting..." : "Export PNG"}
            </button>
          </>
        )
      }
    >
      {/* Off-screen render for full resolution PNG capture */}
      <div
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: `${
            selectedTemplateId === "general-template-1"
              ? GENERAL_TEMPLATE_1_WIDTH
              : selectedTemplateId === "general-template-2"
                ? GENERAL_TEMPLATE_2_WIDTH
                : selectedTemplateId === "general-template-3"
                  ? GENERAL_TEMPLATE_3_WIDTH
                  : selectedTemplateId === "free-fire-theme-template"
                    ? FREE_FIRE_TEMPLATE_WIDTH
                    : selectedTemplateId === "autumn-top-shooters-template"
                      ? TOP_SHOOTERS_AUTUMN_WIDTH
                      : selectedTemplateId === "general-1-top-shooters-template"
                        ? TOP_SHOOTERS_GENERAL1_WIDTH
                        : selectedTemplateId === "general-2-top-shooters-template"
                          ? TOP_SHOOTERS_GENERAL2_WIDTH
                          : AUTUMN_TEMPLATE_WIDTH
          }px`,
          height: `${
            selectedTemplateId === "general-template-1"
              ? GENERAL_TEMPLATE_1_HEIGHT
              : selectedTemplateId === "general-template-2"
                ? GENERAL_TEMPLATE_2_HEIGHT
                : selectedTemplateId === "general-template-3"
                  ? GENERAL_TEMPLATE_3_HEIGHT
                  : selectedTemplateId === "free-fire-theme-template"
                    ? FREE_FIRE_TEMPLATE_HEIGHT
                    : selectedTemplateId === "autumn-top-shooters-template"
                      ? TOP_SHOOTERS_AUTUMN_HEIGHT
                      : selectedTemplateId === "general-1-top-shooters-template"
                        ? TOP_SHOOTERS_GENERAL1_HEIGHT
                        : selectedTemplateId === "general-2-top-shooters-template"
                          ? TOP_SHOOTERS_GENERAL2_HEIGHT
                          : AUTUMN_TEMPLATE_HEIGHT
          }px`,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: -9999,
        }}
      >
        {selectedTemplateId === "general-template-1" ? (
          <GeneralTemplate1StandingsRenderer
            ref={exportRef}
            eventName={displayEventName}
            gameName={eventGameName}
            rows={autumnRows}
            hue={filterHue}
            brightness={filterBrightness}
            contrast={filterContrast}
            saturation={filterSaturation}
          />
        ) : selectedTemplateId === "general-template-2" ? (
          <GeneralTemplate2StandingsRenderer
            ref={exportRef}
            eventName={displayEventName}
            gameName={eventGameName}
            rows={autumnRows}
            hue={filterHue}
            brightness={filterBrightness}
            contrast={filterContrast}
            saturation={filterSaturation}
          />
        ) : selectedTemplateId === "general-template-3" ? (
          <GeneralTemplate3StandingsRenderer
            ref={exportRef}
            eventName={displayEventName}
            gameName={eventGameName}
            rows={autumnRows}
            hue={filterHue}
            brightness={filterBrightness}
            contrast={filterContrast}
            saturation={filterSaturation}
          />
        ) : selectedTemplateId === "free-fire-theme-template" ? (
          <FreeFireThemeTemplateStandingsRenderer
            ref={exportRef}
            eventName={displayEventName}
            rows={autumnRows}
            hue={filterHue}
            brightness={filterBrightness}
            contrast={filterContrast}
            saturation={filterSaturation}
          />
        ) : selectedTemplateId === "autumn-top-shooters-template" ? (
          <TopShootersAutumnTemplateStandingsRenderer
            ref={exportRef}
            eventName={displayEventName}
            shooters={autumnTopShooterRows}
            hue={filterHue}
            brightness={filterBrightness}
            contrast={filterContrast}
            saturation={filterSaturation}
          />
        ) : selectedTemplateId === "general-1-top-shooters-template" ? (
          <TopShootersGeneral1TemplateStandingsRenderer
            ref={exportRef}
            eventName={displayEventName}
            shooters={autumnTopShooterRows}
            hue={filterHue}
            brightness={filterBrightness}
            contrast={filterContrast}
            saturation={filterSaturation}
          />
        ) : selectedTemplateId === "general-2-top-shooters-template" ? (
          <TopShootersGeneral2TemplateStandingsRenderer
            ref={exportRef}
            eventName={displayEventName}
            shooters={autumnTopShooterRows}
            hue={filterHue}
            brightness={filterBrightness}
            contrast={filterContrast}
            saturation={filterSaturation}
          />
        ) : (
          <AutumnSeasonStandingsRenderer
            ref={exportRef}
            eventName={displayEventName}
            gameName={eventGameName}
            rows={autumnRows}
            hue={filterHue}
            brightness={filterBrightness}
            contrast={filterContrast}
            saturation={filterSaturation}
          />
        )}
      </div>

      <div className="relative h-full min-h-0">
        <AnimatePresence mode="wait" initial={false}>
          {step === "select" ? (
            <motion.div
              key="select"
              className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_340px] overflow-hidden bg-white"
              initial={{
                x: stepDirection === -1 ? 30 : 0,
                opacity: stepDirection === -1 ? 0 : 1,
              }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: stepDirection === 1 ? 30 : -30, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {/* Left Column: Templates Grid occupying remaining area */}
              <aside className="flex min-h-0 flex-col border-r border-[#e5e7eb] bg-white">
                <div className="shrink-0 border-b border-[#f0f1f3] px-6 py-3.5">
                  <p className="text-[13px] font-semibold text-[#000000]">Choose Template</p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-6">
                  {templatesLoading ? (
                    <p className="py-10 text-center text-[13px] text-[#6b7280]">Loading templates…</p>
                  ) : availableTemplates.length === 0 ? (
                    <div className="rounded-[10px] border border-dashed border-[#d1d5db] px-5 py-10 text-center">
                      <p className="text-[13px] font-medium text-[#111827]">No matching templates</p>
                      <p className="mt-1 text-[12px] text-[#6b7280]">
                        No templates are tagged “{requiredTemplateTag}” yet. Ask an admin to add this tag.
                      </p>
                    </div>
                  ) : (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
                    {availableTemplates.map((template) => {
                      const isSelected = template.id === selectedTemplateId;
                      return (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => setSelectedTemplateId(template.id)}
                          className={`group relative flex flex-col rounded-[8px] border p-2 text-left transition cursor-pointer ${
                            isSelected
                              ? "border-[#111111] bg-[#fafafa]"
                              : "border-[#e5e7eb] bg-white hover:border-[#111111]"
                          }`}
                        >
                          {/* Template full preview thumbnail */}
                          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[4px] bg-[#141414]">
                            <div className="pointer-events-none absolute inset-0">
                              {template.id === "general-template-1" ? (
                                <GeneralTemplate1Viewport padding={0}>
                                  <GeneralTemplate1StandingsRenderer
                                    eventName={displayEventName}
                                    gameName={eventGameName}
                                    rows={autumnRows}
                                  />
                                </GeneralTemplate1Viewport>
                              ) : template.id === "general-template-2" ? (
                                <GeneralTemplate2Viewport padding={0}>
                                  <GeneralTemplate2StandingsRenderer
                                    eventName={displayEventName}
                                    gameName={eventGameName}
                                    rows={autumnRows}
                                  />
                                </GeneralTemplate2Viewport>
                              ) : template.id === "general-template-3" ? (
                                <GeneralTemplate3Viewport padding={0}>
                                  <GeneralTemplate3StandingsRenderer
                                    eventName={displayEventName}
                                    gameName={eventGameName}
                                    rows={autumnRows}
                                  />
                                </GeneralTemplate3Viewport>
                              ) : template.id === "free-fire-theme-template" ? (
                                <FreeFireThemeTemplateViewport padding={0}>
                                  <FreeFireThemeTemplateStandingsRenderer
                                    eventName={displayEventName}
                                    rows={autumnRows}
                                  />
                                </FreeFireThemeTemplateViewport>
                              ) : template.id === "autumn-top-shooters-template" ? (
                                <TopShootersAutumnTemplateViewport padding={0}>
                                  <TopShootersAutumnTemplateStandingsRenderer
                                    eventName={displayEventName}
                                    shooters={autumnTopShooterRows}
                                  />
                                </TopShootersAutumnTemplateViewport>
                              ) : template.id === "general-1-top-shooters-template" ? (
                                <TopShootersGeneral1TemplateViewport padding={0}>
                                  <TopShootersGeneral1TemplateStandingsRenderer
                                    eventName={displayEventName}
                                    shooters={autumnTopShooterRows}
                                  />
                                </TopShootersGeneral1TemplateViewport>
                              ) : template.id === "general-2-top-shooters-template" ? (
                                <TopShootersGeneral2TemplateViewport padding={0}>
                                  <TopShootersGeneral2TemplateStandingsRenderer
                                    eventName={displayEventName}
                                    shooters={autumnTopShooterRows}
                                  />
                                </TopShootersGeneral2TemplateViewport>
                              ) : (
                                <AutumnStandingsViewport padding={0}>
                                  <AutumnSeasonStandingsRenderer
                                    eventName={displayEventName}
                                    gameName={eventGameName}
                                    rows={autumnRows}
                                  />
                                </AutumnStandingsViewport>
                              )}
                            </div>
                            {/* Hover dark overlay with Select and hand pointer */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity duration-150 group-hover:opacity-100 cursor-pointer">
                              <span className="text-[12px] font-medium text-white tracking-wide">
                                Select
                              </span>
                            </div>
                          </div>

                          {/* Template Name & Category */}
                          <div className="mt-2 min-w-0">
                            <p className="truncate text-[12px] font-medium text-[#111827]">
                              {template.name}
                            </p>
                            <p className="truncate text-[10px] text-[#6b7280]">
                              {template.format} · {template.category}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  )}
                </div>
              </aside>

              {/* Right Column: Preview with only required space and white background, no shadow */}
              <section className="flex min-h-0 flex-col overflow-hidden bg-white p-4">
                <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
                  <div className="flex h-full w-full max-w-[310px] items-center justify-center overflow-hidden">
                    {selectedTemplateId === "general-template-1" ? (
                      <GeneralTemplate1Viewport padding={8}>
                        <GeneralTemplate1StandingsRenderer
                          eventName={displayEventName}
                          gameName={eventGameName}
                          rows={autumnRows}
                          hue={filterHue}
                          brightness={filterBrightness}
                          contrast={filterContrast}
                          saturation={filterSaturation}
                        />
                      </GeneralTemplate1Viewport>
                    ) : selectedTemplateId === "general-template-2" ? (
                      <GeneralTemplate2Viewport padding={8}>
                        <GeneralTemplate2StandingsRenderer
                          eventName={displayEventName}
                          gameName={eventGameName}
                          rows={autumnRows}
                          hue={filterHue}
                          brightness={filterBrightness}
                          contrast={filterContrast}
                          saturation={filterSaturation}
                        />
                      </GeneralTemplate2Viewport>
                    ) : selectedTemplateId === "general-template-3" ? (
                      <GeneralTemplate3Viewport padding={8}>
                        <GeneralTemplate3StandingsRenderer
                          eventName={displayEventName}
                          gameName={eventGameName}
                          rows={autumnRows}
                          hue={filterHue}
                          brightness={filterBrightness}
                          contrast={filterContrast}
                          saturation={filterSaturation}
                        />
                      </GeneralTemplate3Viewport>
                    ) : selectedTemplateId === "free-fire-theme-template" ? (
                      <FreeFireThemeTemplateViewport padding={8}>
                        <FreeFireThemeTemplateStandingsRenderer
                          eventName={displayEventName}
                          rows={autumnRows}
                          hue={filterHue}
                          brightness={filterBrightness}
                          contrast={filterContrast}
                          saturation={filterSaturation}
                        />
                      </FreeFireThemeTemplateViewport>
                    ) : selectedTemplateId === "autumn-top-shooters-template" ? (
                      <TopShootersAutumnTemplateViewport padding={8}>
                        <TopShootersAutumnTemplateStandingsRenderer
                          eventName={displayEventName}
                          shooters={autumnTopShooterRows}
                          hue={filterHue}
                          brightness={filterBrightness}
                          contrast={filterContrast}
                          saturation={filterSaturation}
                        />
                      </TopShootersAutumnTemplateViewport>
                    ) : selectedTemplateId === "general-1-top-shooters-template" ? (
                      <TopShootersGeneral1TemplateViewport padding={8}>
                        <TopShootersGeneral1TemplateStandingsRenderer
                          eventName={displayEventName}
                          shooters={autumnTopShooterRows}
                          hue={filterHue}
                          brightness={filterBrightness}
                          contrast={filterContrast}
                          saturation={filterSaturation}
                        />
                      </TopShootersGeneral1TemplateViewport>
                    ) : selectedTemplateId === "general-2-top-shooters-template" ? (
                      <TopShootersGeneral2TemplateViewport padding={8}>
                        <TopShootersGeneral2TemplateStandingsRenderer
                          eventName={displayEventName}
                          shooters={autumnTopShooterRows}
                          hue={filterHue}
                          brightness={filterBrightness}
                          contrast={filterContrast}
                          saturation={filterSaturation}
                        />
                      </TopShootersGeneral2TemplateViewport>
                    ) : (
                      <AutumnStandingsViewport padding={8}>
                        <AutumnSeasonStandingsRenderer
                          eventName={displayEventName}
                          gameName={eventGameName}
                          rows={autumnRows}
                          hue={filterHue}
                          brightness={filterBrightness}
                          contrast={filterContrast}
                          saturation={filterSaturation}
                        />
                      </AutumnStandingsViewport>
                    )}
                  </div>
                </div>
              </section>
            </motion.div>
          ) : (
            <motion.div
              key="edit"
              className="grid h-full min-h-0 grid-cols-[280px_minmax(0,1fr)_260px] overflow-hidden bg-white"
              initial={{ x: stepDirection === 1 ? -30 : 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: stepDirection === -1 ? -30 : 30, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {/* Left Column: Image Adjustments (4 Sliders) */}
              <aside className="flex min-h-0 flex-col border-r border-[#e5e7eb] bg-white">
                <div className="flex shrink-0 items-center justify-between border-b border-[#f0f1f3] px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-[#111111]" />
                    <span className="text-[13px] font-semibold text-[#000000]">Image Adjustments</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetAdjustments}
                    className="flex cursor-pointer items-center gap-1 rounded-[6px] border border-[#e2e5ec] px-2 py-1 text-[11px] font-medium text-[#4b5563] hover:bg-[#f7f8fb] hover:text-[#000000]"
                    title="Reset image adjustments to default"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset</span>
                  </button>
                </div>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                  {/* 1. Hue Slider */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-[13px] font-medium text-[#374151]">Hue</label>
                      <span className="rounded-[4px] bg-[#f3f4f6] px-2 py-0.5 text-[12px] font-semibold tabular-nums text-[#111827]">
                        {filterHue}°
                      </span>
                    </div>
                    <div className="rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] p-3">
                      <input
                        type="range"
                        min={0}
                        max={360}
                        step={1}
                        value={filterHue}
                        onChange={(e) => setFilterHue(Number(e.target.value))}
                        className="h-2 w-full cursor-pointer appearance-none rounded-full"
                        style={{
                          background:
                            "linear-gradient(90deg, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)",
                        }}
                      />
                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#6b7280]">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-4 w-4 rounded-full border border-black/15 shadow-sm"
                            style={{ background: `hsl(${filterHue}, 85%, 45%)` }}
                          />
                          <span>Live Tone</span>
                        </div>
                        <span>0° - 360°</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Brightness Slider */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-[13px] font-medium text-[#374151]">Brightness</label>
                      <span className="rounded-[4px] bg-[#f3f4f6] px-2 py-0.5 text-[12px] font-semibold tabular-nums text-[#111827]">
                        {filterBrightness}%
                      </span>
                    </div>
                    <div className="rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] p-3">
                      <input
                        type="range"
                        min={50}
                        max={150}
                        step={1}
                        value={filterBrightness}
                        onChange={(e) => setFilterBrightness(Number(e.target.value))}
                        className="h-2 w-full cursor-pointer appearance-none rounded-full accent-black"
                        style={{
                          background:
                            "linear-gradient(90deg, #4b5563 0%, #d1d5db 50%, #ffffff 100%)",
                        }}
                      />
                      <div className="mt-2 flex items-center justify-between text-[11px] text-[#6b7280]">
                        <span>50%</span>
                        <span className="font-medium text-[#374151]">100% (Default)</span>
                        <span>150%</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Contrast Slider */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-[13px] font-medium text-[#374151]">Contrast</label>
                      <span className="rounded-[4px] bg-[#f3f4f6] px-2 py-0.5 text-[12px] font-semibold tabular-nums text-[#111827]">
                        {filterContrast}%
                      </span>
                    </div>
                    <div className="rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] p-3">
                      <input
                        type="range"
                        min={50}
                        max={150}
                        step={1}
                        value={filterContrast}
                        onChange={(e) => setFilterContrast(Number(e.target.value))}
                        className="h-2 w-full cursor-pointer appearance-none rounded-full accent-black"
                        style={{
                          background: "linear-gradient(90deg, #9ca3af 0%, #111827 100%)",
                        }}
                      />
                      <div className="mt-2 flex items-center justify-between text-[11px] text-[#6b7280]">
                        <span>50%</span>
                        <span className="font-medium text-[#374151]">100% (Default)</span>
                        <span>150%</span>
                      </div>
                    </div>
                  </div>

                  {/* 4. Saturation Slider */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-[13px] font-medium text-[#374151]">Saturation</label>
                      <span className="rounded-[4px] bg-[#f3f4f6] px-2 py-0.5 text-[12px] font-semibold tabular-nums text-[#111827]">
                        {filterSaturation}%
                      </span>
                    </div>
                    <div className="rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] p-3">
                      <input
                        type="range"
                        min={0}
                        max={200}
                        step={1}
                        value={filterSaturation}
                        onChange={(e) => setFilterSaturation(Number(e.target.value))}
                        className="h-2 w-full cursor-pointer appearance-none rounded-full accent-black"
                        style={{
                          background: "linear-gradient(90deg, #9ca3af 0%, #ef4444 100%)",
                        }}
                      />
                      <div className="mt-2 flex items-center justify-between text-[11px] text-[#6b7280]">
                        <span>0% (Mono)</span>
                        <span className="font-medium text-[#374151]">100%</span>
                        <span>200%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </aside>

              {/* Center Column: Live Responsive Canvas on White Background, no shadow */}
              <section className="flex min-h-0 flex-col overflow-hidden bg-white p-4">
                <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
                  <div className="flex h-full w-full max-w-[500px] items-center justify-center overflow-hidden">
                    {selectedTemplateId === "general-template-1" ? (
                      <GeneralTemplate1Viewport padding={16}>
                        <GeneralTemplate1StandingsRenderer
                          eventName={displayEventName}
                          gameName={eventGameName}
                          rows={autumnRows}
                          hue={filterHue}
                          brightness={filterBrightness}
                          contrast={filterContrast}
                          saturation={filterSaturation}
                        />
                      </GeneralTemplate1Viewport>
                    ) : selectedTemplateId === "general-template-2" ? (
                      <GeneralTemplate2Viewport padding={16}>
                        <GeneralTemplate2StandingsRenderer
                          eventName={displayEventName}
                          gameName={eventGameName}
                          rows={autumnRows}
                          hue={filterHue}
                          brightness={filterBrightness}
                          contrast={filterContrast}
                          saturation={filterSaturation}
                        />
                      </GeneralTemplate2Viewport>
                    ) : selectedTemplateId === "general-template-3" ? (
                      <GeneralTemplate3Viewport padding={16}>
                        <GeneralTemplate3StandingsRenderer
                          eventName={displayEventName}
                          gameName={eventGameName}
                          rows={autumnRows}
                          hue={filterHue}
                          brightness={filterBrightness}
                          contrast={filterContrast}
                          saturation={filterSaturation}
                        />
                      </GeneralTemplate3Viewport>
                    ) : selectedTemplateId === "free-fire-theme-template" ? (
                      <FreeFireThemeTemplateViewport padding={16}>
                        <FreeFireThemeTemplateStandingsRenderer
                          eventName={displayEventName}
                          rows={autumnRows}
                          hue={filterHue}
                          brightness={filterBrightness}
                          contrast={filterContrast}
                          saturation={filterSaturation}
                        />
                      </FreeFireThemeTemplateViewport>
                    ) : selectedTemplateId === "autumn-top-shooters-template" ? (
                      <TopShootersAutumnTemplateViewport padding={16}>
                        <TopShootersAutumnTemplateStandingsRenderer
                          eventName={displayEventName}
                          shooters={autumnTopShooterRows}
                          hue={filterHue}
                          brightness={filterBrightness}
                          contrast={filterContrast}
                          saturation={filterSaturation}
                        />
                      </TopShootersAutumnTemplateViewport>
                    ) : selectedTemplateId === "general-1-top-shooters-template" ? (
                      <TopShootersGeneral1TemplateViewport padding={16}>
                        <TopShootersGeneral1TemplateStandingsRenderer
                          eventName={displayEventName}
                          shooters={autumnTopShooterRows}
                          hue={filterHue}
                          brightness={filterBrightness}
                          contrast={filterContrast}
                          saturation={filterSaturation}
                        />
                      </TopShootersGeneral1TemplateViewport>
                    ) : selectedTemplateId === "general-2-top-shooters-template" ? (
                      <TopShootersGeneral2TemplateViewport padding={16}>
                        <TopShootersGeneral2TemplateStandingsRenderer
                          eventName={displayEventName}
                          shooters={autumnTopShooterRows}
                          hue={filterHue}
                          brightness={filterBrightness}
                          contrast={filterContrast}
                          saturation={filterSaturation}
                        />
                      </TopShootersGeneral2TemplateViewport>
                    ) : (
                      <AutumnStandingsViewport padding={16}>
                        <AutumnSeasonStandingsRenderer
                          eventName={displayEventName}
                          gameName={eventGameName}
                          rows={autumnRows}
                          hue={filterHue}
                          brightness={filterBrightness}
                          contrast={filterContrast}
                          saturation={filterSaturation}
                        />
                      </AutumnStandingsViewport>
                    )}
                  </div>
                </div>
              </section>

              {/* Right Column: Template Content */}
              <aside className="flex min-h-0 flex-col border-l border-[#e5e7eb] bg-white">
                <div className="shrink-0 border-b border-[#f0f1f3] px-5 py-3.5">
                  <p className="text-[13px] font-semibold text-[#000000]">Event Name</p>
                </div>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                  {/* Event Name Input */}
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-[#374151]">
                      Event Name
                    </label>
                    <input
                      type="text"
                      value={displayEventName}
                      onChange={(e) => setDisplayEventName(e.target.value)}
                      placeholder="e.g. Grand Arena Championship"
                      className="h-[40px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[14px] text-[#000000] outline-none placeholder:text-[#9ca3af] focus:border-[#000000]"
                    />
                  </div>
                </div>
              </aside>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppPopupWindow>
  );
}


const TEMPLATE_COLOR_PRESETS = [
  "#ff6a00",
  "#111111",
  "#e11d48",
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#0891b2",
];

function normalizeHexColor(value: string) {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash : value;
}

function ThemedColorPicker({
  value,
  open,
  onOpenChange,
  onChange,
  containerRef,
}: {
  value: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex h-[42px] w-full cursor-pointer items-center justify-between rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-left transition-colors hover:bg-[#f7f8fb]"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            className="h-5 w-5 shrink-0 rounded-[5px] border border-black/10 shadow-inner"
            style={{ background: value }}
          />
          <span className="truncate text-[13px] font-semibold uppercase text-[#000000]">
            {value}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[#9aa1b0] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute left-0 right-0 top-[48px] z-[120] rounded-[12px] border border-[#e2e5ec] bg-white p-3 shadow-[0_18px_48px_rgba(15,23,42,0.14)]"
          >
            <div className="grid grid-cols-4 gap-2">
              {TEMPLATE_COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    onChange(color);
                    onOpenChange(false);
                  }}
                  className={`h-9 cursor-pointer rounded-[8px] border transition-transform hover:scale-[1.03] ${
                    color.toLowerCase() === value.toLowerCase()
                      ? "border-[#000000] ring-2 ring-black/10"
                      : "border-[#e2e5ec]"
                  }`}
                  style={{ background: color }}
                  aria-label={`Use ${color}`}
                />
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2 border-t border-[#f0f1f3] pt-3">
              <input
                type="text"
                value={value}
                onChange={(event) => onChange(normalizeHexColor(event.target.value))}
                className="h-[38px] min-w-0 flex-1 rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[13px] font-semibold uppercase text-[#000000] outline-none focus:border-[#000000]"
              />
              <span
                className="h-[38px] w-[38px] shrink-0 rounded-[8px] border border-[#e2e5ec]"
                style={{ background: value }}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function AuditLogsTab({ eventId }: { eventId: string }) {
  const [logs, setLogs] = useState<ApiAuditLog[]>([]);
  const [scoringRuleNames, setScoringRuleNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await auditLogsApi.getByEvent(eventId);
      const scoringRuleIds = Array.from(
        new Set(
          rows.flatMap((log) =>
            log.changes
              .filter((change) => change.field === "scoringRuleId")
              .flatMap((change) => [change.previousValue, change.newValue])
              .filter(isObjectIdLike),
          ),
        ),
      );

      if (scoringRuleIds.length > 0) {
        const rules = await scoringRulesApi.getAll().catch(() => []);
        const names = Object.fromEntries(rules.map((rule) => [rule._id, rule.name]));
        const missingIds = scoringRuleIds.filter((id) => !names[id]);
        const missingRules = await Promise.all(
          missingIds.map((id) => scoringRulesApi.getById(id).catch(() => null)),
        );
        missingRules.forEach((rule) => {
          if (rule) names[rule._id] = rule.name;
        });
        setScoringRuleNames(names);
      } else {
        setScoringRuleNames({});
      }
      setLogs(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load audit logs");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  return (
    <div className="mx-auto flex h-full max-w-[1200px] flex-col">
      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <h2 className="text-[24px] font-semibold text-[#000000]">Audit Logs</h2>
          <p className="mt-1 text-[14px] text-[#666666]">
            Track event changes with user, timestamp, and previous/new values.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadLogs()}
          disabled={loading}
          className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[6px] border border-[#e2e5ec] bg-white px-4 text-[13px] font-medium text-[#000000] transition-colors hover:bg-[#f9fbfc] disabled:cursor-not-allowed disabled:opacity-70"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-[10px] border border-[#e2e5ec] bg-white">
        {loading ? (
          <div className="grid h-full min-h-[360px] place-items-center">
            <GlobalPageLoader label="Loading logs" variant="section" />
          </div>
        ) : error ? (
          <div className="grid h-full min-h-[360px] place-items-center px-6 text-center">
            <div>
              <p className="text-[15px] font-semibold text-[#000000]">Could not load logs</p>
              <p className="mt-1 text-[13px] text-[#666666]">{error}</p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="grid h-full min-h-[360px] place-items-center px-6 text-center">
            <div>
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-[#f0f1f3]">
                <History className="h-6 w-6 text-[#9aa1b0]" />
              </div>
              <p className="text-[15px] font-semibold text-[#000000]">No audit logs yet</p>
              <p className="mt-1 max-w-[360px] text-[13px] text-[#666666]">
                Changes made inside this event will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="divide-y divide-[#f0f1f3]">
              {logs.map((log) => (
                <div key={log._id} className="px-6 py-5">
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-[4px] bg-[#f0f1f3] px-2 py-0.5 text-[11px] font-semibold uppercase text-[#4b5563]">
                          {log.category}
                        </span>
                        <span className="text-[12px] text-[#9aa1b0]">{auditActionLabel(log.action)}</span>
                      </div>
                      <p className="text-[14px] font-semibold text-[#000000]">{log.message}</p>
                      <p className="mt-1 text-[12px] text-[#666666]">
                        {log.userName}
                      </p>
                    </div>
                    <time className="shrink-0 text-right text-[12px] text-[#666666]">
                      {new Date(log.createdAt).toLocaleString()}
                    </time>
                  </div>

                  {shouldShowAuditChanges(log) && (
                    <div className="mt-4 space-y-2">
                      {log.changes.map((change) => (
                        <div
                          key={`${log._id}-${change.field}`}
                          className="rounded-[6px] border border-[#eef0f4] bg-[#f9fbfc] px-3 py-2 text-[13px] text-[#4b5563]"
                        >
                          {auditChangeText(change, scoringRuleNames)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type SettingsData = {
  name: string;
  gameId: string | null;
  game: string;
  gameLogo?: string | null;
  startDate: string;
  endDate: string;
  mode: string;
  killPoints: number;
  placementPoints: number[];
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  scoringRuleId?: string | null;
  scoringRuleIsTemplate?: boolean;
  scoringPresetId?: string | null;
};

function eventToSettings(event: ApiEvent): SettingsData {
  const rule =
    event.scoringRuleId && typeof event.scoringRuleId !== "string"
      ? (event.scoringRuleId as ApiScoringRule)
      : null;
  const game = getEventGame(event);

  return {
    name: event.name,
    gameId: typeof event.gameId === "string" ? event.gameId : event.gameId?._id || null,
    game: game.name,
    gameLogo: game.logo,
    startDate: event.startDate || "",
    endDate: event.endDate || "",
    mode: event.format,
    killPoints: rule?.killPoints ?? DEFAULT_MATCH_SCORING.killPointsPerKill,
    placementPoints: placementMapToArray(rule?.placementPoints, 8),
    winPoints: rule?.winPoints ?? 3,
    drawPoints: rule?.drawPoints ?? 1,
    lossPoints: rule?.lossPoints ?? 0,
    scoringRuleId:
      event.scoringRuleId && typeof event.scoringRuleId !== "string"
        ? event.scoringRuleId._id
        : typeof event.scoringRuleId === "string"
          ? event.scoringRuleId
          : null,
    scoringRuleIsTemplate: rule ? rule.isTemplate !== false : false,
    scoringPresetId: rule && rule.isTemplate !== false ? rule._id : null,
  };
}

function SettingsTab({
  event,
  onEventUpdated,
  onDeleted,
  onAuditLog,
}: {
  event: ApiEvent | null;
  onEventUpdated: (event: ApiEvent) => void;
  onDeleted: () => void;
  onAuditLog: AuditLogger;
}) {
  const settings = useMemo(() => (event ? eventToSettings(event) : null), [event]);
  const [isEditingOptions, setIsEditingOptions] = useState(false);
  const [isEditingScoring, setIsEditingScoring] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  if (!event || !settings) return null;

  const saveOptions = async (newSettings: SettingsData) => {
    try {
      const updated = await eventsApi.update(event._id, {
        name: newSettings.name.trim(),
        gameId: newSettings.gameId,
        game: newSettings.game,
        format: newSettings.mode,
        startDate: newSettings.startDate,
        endDate: newSettings.endDate,
      });
      onEventUpdated(updated);
      setIsEditingOptions(false);
      const changes = compactChanges([
        auditChange("name", "Event name", settings.name, newSettings.name.trim()),
        auditChange("game", "Game", settings.game, newSettings.game),
        auditChange("mode", "Mode", settings.mode, newSettings.mode),
        auditChange("startDate", "Start date", settings.startDate, newSettings.startDate),
        auditChange("endDate", "End date", settings.endDate, newSettings.endDate),
      ]);
      if (changes.length > 0) {
        await onAuditLog({
          category: "event",
          action: "event_options_updated",
          message: "Changed event options.",
          changes,
          metadata: { eventId: event._id },
        });
      }
      queue.add(
        { title: "Event updated", description: "Event options were saved.", variant: "success" },
        { timeout: 4000 },
      );
    } catch (err) {
      queue.add(
        {
          title: "Update failed",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "error",
        },
        { timeout: 5000 },
      );
    }
  };

  const saveScoring = async (newSettings: SettingsData) => {
    try {
      const selectedPresetId = newSettings.scoringPresetId || null;
      if (selectedPresetId) {
        const previousPresetName = scoringRuleDisplayName(event.scoringRuleId);
        const updated = await eventsApi.update(event._id, { scoringRuleId: selectedPresetId });
        const selectedPresetName = scoringRuleDisplayName(updated.scoringRuleId);
        onEventUpdated(updated);
        setIsEditingScoring(false);
        await onAuditLog({
          category: "scoring",
          action: "scoring_preset_selected",
          message: "Changed event scoring preset.",
          changes: compactChanges([
            auditChange(
              "scoringRuleId",
              "Scoring preset",
              previousPresetName,
              selectedPresetName,
              `Changed scoring preset from ${previousPresetName} to ${selectedPresetName}.`,
            ),
          ]),
          metadata: { scoringRuleId: selectedPresetId, scoringRuleName: selectedPresetName },
        });
        queue.add({
          title: "Scoring updated",
          description: "Scoring preset was saved for this event.",
          variant: "success",
        });
        return;
      }

      const payload = {
        name: `${settings.name} Scoring`,
        format: newSettings.mode,
        description: "Event scoring rules",
        killPoints: newSettings.killPoints,
        winPoints: newSettings.winPoints,
        drawPoints: newSettings.drawPoints,
        lossPoints: newSettings.lossPoints,
        placementPoints: placementArrayToMap(newSettings.placementPoints),
        isTemplate: false,
      };
      const currentRuleId =
        event.scoringRuleId && typeof event.scoringRuleId !== "string"
          ? event.scoringRuleId._id
          : typeof event.scoringRuleId === "string"
            ? event.scoringRuleId
            : null;
      const canUpdateCurrentRule =
        currentRuleId &&
        event.scoringRuleId &&
        typeof event.scoringRuleId !== "string" &&
        event.scoringRuleId.isTemplate === false;
      const rule = canUpdateCurrentRule
        ? await scoringRulesApi.update(currentRuleId, payload)
        : await scoringRulesApi.create(payload);
      const updated = await eventsApi.update(event._id, { scoringRuleId: rule._id });
      onEventUpdated(updated);
      setIsEditingScoring(false);
      const changes = compactChanges([
        auditChange("killPoints", "Kill points", settings.killPoints, newSettings.killPoints),
        auditChange("winPoints", "Win points", settings.winPoints, newSettings.winPoints),
        auditChange("drawPoints", "Draw points", settings.drawPoints, newSettings.drawPoints),
        auditChange("lossPoints", "Loss points", settings.lossPoints, newSettings.lossPoints),
        auditChange(
          "placementPoints",
          "Placement points",
          settings.placementPoints,
          newSettings.placementPoints,
        ),
      ]);
      if (changes.length > 0 || !canUpdateCurrentRule) {
        await onAuditLog({
          category: "scoring",
          action: canUpdateCurrentRule ? "scoring_updated" : "scoring_created",
          message: canUpdateCurrentRule
            ? "Changed event scoring rules."
            : "Created event scoring rules.",
          changes: canUpdateCurrentRule ? changes : [],
          metadata: { scoringRuleId: rule._id },
        });
      }
      queue.add(
        {
          title: "Scoring updated",
          description: "Event scoring rules were saved.",
          variant: "success",
        },
        { timeout: 4000 },
      );
    } catch (err) {
      queue.add(
        {
          title: "Update failed",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "error",
        },
        { timeout: 5000 },
      );
    }
  };

  const deleteEvent = async () => {
    try {
      await eventsApi.delete(event._id);
      queue.add(
        { title: "Event deleted", description: `${event.name} was deleted.`, variant: "success" },
        { timeout: 4000 },
      );
      onDeleted();
    } catch (err) {
      queue.add(
        {
          title: "Delete failed",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "error",
        },
        { timeout: 5000 },
      );
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-[24px] font-semibold text-[#000000]">Settings</h2>
          <p className="mt-1 text-[14px] text-[#666666]">
            Update event options, scoring rules, and event-level controls.
          </p>
        </div>
      </div>

      <section className="rounded-[10px] border border-[#e2e5ec] bg-white">
        <div className="flex items-center justify-between border-b border-[#f0f1f3] px-6 py-4">
          <div>
            <h3 className="text-[16px] font-semibold text-[#000000]">Event Options</h3>
            <p className="mt-1 text-[13px] text-[#9aa1b0]">Basic details shown across the event.</p>
          </div>
          <button
            onClick={() => setIsEditingOptions(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-[#e2e5ec] px-3 py-1.5 text-[13px] font-medium text-[#000000] transition-colors hover:bg-[#f7f8fb]"
          >
            <Pencil className="h-4 w-4" /> Edit Options
          </button>
        </div>
        <div className="grid grid-cols-3 gap-6 px-6 py-5">
          <div>
            <p className="text-[12px] font-medium text-[#9aa1b0]">Event Name</p>
            <p className="mt-1 text-[14px] font-medium text-[#000000]">{settings.name}</p>
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#9aa1b0]">Game</p>
            <p className="mt-1 text-[14px] font-medium text-[#000000]">
              <GameLabel name={settings.game} logo={settings.gameLogo} iconClassName="h-5 w-16" />
            </p>
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#9aa1b0]">Mode</p>
            <p className="mt-1 text-[14px] font-medium text-[#000000]">{settings.mode}</p>
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#9aa1b0]">Start Date</p>
            <p className="mt-1 text-[14px] font-medium text-[#000000]">{settings.startDate}</p>
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#9aa1b0]">End Date</p>
            <p className="mt-1 text-[14px] font-medium text-[#000000]">{settings.endDate}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[10px] border border-[#e2e5ec] bg-white">
        <div className="flex items-center justify-between border-b border-[#f0f1f3] px-6 py-4">
          <div>
            <h3 className="text-[16px] font-semibold text-[#000000]">Scoring Rules</h3>
            <p className="mt-1 text-[13px] text-[#9aa1b0]">
              Kill, placement, and match outcome points.
            </p>
          </div>
          <button
            onClick={() => setIsEditingScoring(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-[#e2e5ec] px-3 py-1.5 text-[13px] font-medium text-[#000000] transition-colors hover:bg-[#f7f8fb]"
          >
            <Pencil className="h-4 w-4" /> Edit Rules
          </button>
        </div>
        <div className="space-y-6 px-6 py-5">
          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-[12px] font-medium text-[#9aa1b0]">Points per Kill</p>
              <p className="mt-1 text-[14px] font-medium text-[#000000]">{settings.killPoints}</p>
            </div>
            <div>
              <p className="text-[12px] font-medium text-[#9aa1b0]">Win Points</p>
              <p className="mt-1 text-[14px] font-medium text-[#000000]">{settings.winPoints}</p>
            </div>
            <div>
              <p className="text-[12px] font-medium text-[#9aa1b0]">Draw Points</p>
              <p className="mt-1 text-[14px] font-medium text-[#000000]">{settings.drawPoints}</p>
            </div>
            <div>
              <p className="text-[12px] font-medium text-[#9aa1b0]">Loss Points</p>
              <p className="mt-1 text-[14px] font-medium text-[#000000]">{settings.lossPoints}</p>
            </div>
          </div>

          <div>
            <p className="mb-3 text-[12px] font-medium text-[#9aa1b0]">Placement Points</p>
            <div className="flex flex-wrap gap-3">
              {settings.placementPoints.map((points, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-[6px] border border-[#e2e5ec] bg-[#f9fbfc] px-3 py-1.5"
                >
                  <span className="text-[12px] font-medium text-[#666666]">#{index + 1}</span>
                  <span className="text-[13px] font-bold text-[#000000]">{points} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[10px] border border-[#fecaca] bg-white">
        <div className="flex items-start justify-between gap-6 px-6 py-5">
          <div className="flex gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fee2e2] text-[#dc2626]">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-[#991b1b]">Delete Event</h3>
              <p className="mt-1 max-w-[620px] text-[13px] text-[#7f1d1d]">
                Permanently delete this event, including teams, matches, results, and standings.
                This action cannot be undone.
              </p>
            </div>
          </div>
          <button
            onClick={() => setDeleteConfirmOpen(true)}
            className="cursor-pointer rounded-[6px] bg-[#dc2626] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#b91c1c]"
          >
            Delete Event
          </button>
        </div>
      </section>

      <EditEventOptionsModal
        open={isEditingOptions}
        settings={settings}
        onClose={() => setIsEditingOptions(false)}
        onSave={saveOptions}
      />

      <EditScoringRulesModal
        open={isEditingScoring}
        settings={settings}
        onClose={() => setIsEditingScoring(false)}
        onSave={saveScoring}
      />
      <ThemedConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete event?"
        description="This will permanently delete the event, its matches, results, event-only teams, and standings."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={deleteEvent}
      />
    </div>
  );
}

function EditEventOptionsModal({
  open,
  settings,
  onClose,
  onSave,
}: {
  open: boolean;
  settings: SettingsData;
  onClose: () => void;
  onSave: (settings: SettingsData) => void;
}) {
  const [formData, setFormData] = useState<SettingsData>(settings);
  const [mounted, setMounted] = useState(open);
  const [catalogGames, setCatalogGames] = useState<CatalogGame[]>([]);
  const [gameOptions, setGameOptions] = useState<
    { label: string; value: string; icon?: ReactNode }[]
  >([]);

  useEffect(() => {
    if (open) setFormData(settings);
  }, [open, settings]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }

    const timeout = window.setTimeout(() => setMounted(false), 220);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    catalogApi
      .getGames()
      .then((games) => {
        const catalogGames = apiGamesToCodeCatalogGames(games);
        setCatalogGames(catalogGames);
        setGameOptions(
          getGameNameOptions(catalogGames).map((name) => {
            const game = catalogGames.find((item) => item.name === name);
            return {
              label: name,
              value: name,
              icon: game ? (
                <GameIcon
                  name={game.name}
                  logo={game.logoLight || game.logoDark || game.logo}
                  size="dropdown"
                />
              ) : undefined,
            };
          }),
        );
      })
      .catch(() => {
        setCatalogGames([]);
        setGameOptions([{ label: formData.game || "Other", value: formData.game || "Other" }]);
      });
  }, [open, formData.game]);

  useEffect(() => {
    if (!open || catalogGames.length === 0) return;
    const game =
      catalogGames.find((item) => item.id === formData.gameId) ??
      catalogGames.find((item) => item.name === formData.game);
    if (!game?.formats.length) return;
    if (game.formats.some((format) => format.key === formData.mode)) return;

    const matchingFormat = game.formats.find((format) => format.name === formData.mode);
    setFormData((current) => ({
      ...current,
      mode: matchingFormat?.key ?? game.formats[0].key,
    }));
  }, [open, catalogGames, formData.game, formData.mode]);

  if (!mounted) return null;

  const selectedGame =
    catalogGames.find((game) => game.id === formData.gameId) ??
    catalogGames.find((game) => game.name === formData.game);
  const selectedGameFormats = selectedGame?.formats ?? [];
  const activeFormat =
    selectedGameFormats.find((format) => format.key === formData.mode) ??
    selectedGameFormats.find((format) => format.name === formData.mode);
  const formatOptions = selectedGameFormats.length
    ? selectedGameFormats.map((format) => ({ label: format.name, value: format.key }))
    : formData.mode
      ? [{ label: activeFormat?.name ?? formData.mode, value: activeFormat?.key ?? formData.mode }]
      : [];

  const updateGame = (gameName: string) => {
    const game = catalogGames.find((item) => item.name === gameName);
    const firstFormat = game?.formats[0];
    setFormData({
      ...formData,
      gameId: game?.id ?? null,
      game: gameName,
      gameLogo: game?.logoLight || game?.logoDark || game?.logo || null,
      mode: firstFormat?.key ?? formData.mode,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-[500px] flex-col gap-0 overflow-hidden rounded-[16px] border border-[#e2e5ec] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
        <DialogTitle className="sr-only">Edit Event Options</DialogTitle>
        <div className="flex items-center justify-between border-b border-[#f0f1f3] px-6 py-4">
          <h2 className="text-[18px] font-semibold text-[#000000]">Edit Event Options</h2>
          <button
            onClick={onClose}
            className="rounded-[8px] p-2 text-[#9aa1b0] hover:bg-[#f7f8fb] hover:text-[#000000]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
              Event Name
            </label>
            <input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-[40px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[14px] text-[#000000] outline-none focus:border-[#999]"
            />
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">Game</label>
              <AppSearchSelect value={formData.game} onChange={updateGame} options={gameOptions} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">Mode</label>
              <AppSelect
                value={formData.mode}
                onChange={(value) => setFormData({ ...formData, mode: value })}
                options={formatOptions}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                Start Date
              </label>
              <AppDatePicker
                value={formData.startDate}
                onChange={(date) => setFormData({ ...formData, startDate: date })}
                placeholder="Select start date"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                End Date
              </label>
              <AppDatePicker
                value={formData.endDate}
                onChange={(date) => setFormData({ ...formData, endDate: date })}
                placeholder="Select end date"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#f0f1f3] bg-[#fcfdfd] px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-[8px] border border-[#e2e5ec] px-4 py-2 text-[13px] font-medium text-[#666666] hover:bg-[#f7f8fb]"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="rounded-[8px] bg-[#000000] px-5 py-2 text-[13px] font-medium text-white hover:bg-[#333]"
          >
            Save Changes
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const CUSTOM_SCORING_VALUE = "Custom";
const TEMPLATE_SCORING_PREFIX = "template:";

function normalizeScoringFormat(value?: string) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (normalized === "br" || normalized.includes("battle")) return "battle_royale";
  if (normalized === "tdm" || normalized.includes("elimination")) return "elimination";
  return normalized;
}

function scoringTemplateOptions(templates: ScoringRuleTemplate[], format?: string) {
  const normalizedFormat = normalizeScoringFormat(format);
  return [
    { label: CUSTOM_SCORING_VALUE, value: CUSTOM_SCORING_VALUE },
    ...templates
      .filter((template) => normalizeScoringFormat(template.format) === normalizedFormat)
      .map((template) => ({
        label: template.name,
        value: `${TEMPLATE_SCORING_PREFIX}${template.id}`,
      })),
  ];
}

function settingsFromScoringTemplate(
  template: ScoringRuleTemplate,
  settings: SettingsData,
): SettingsData {
  const placementPoints =
    template.placementPoints.length > 0
      ? [
          ...template.placementPoints,
          ...Array.from(
            {
              length: Math.max(
                0,
                settings.placementPoints.length - template.placementPoints.length,
              ),
            },
            () => 0,
          ),
        ]
      : settings.placementPoints;

  return {
    ...settings,
    placementPoints,
    killPoints: template.killPointsPerKill,
    winPoints: template.winPoints,
    drawPoints: template.drawPoints,
    lossPoints: template.lossPoints,
    scoringPresetId: template.id,
  };
}

function EditScoringRulesModal({
  open,
  settings,
  onClose,
  onSave,
}: {
  open: boolean;
  settings: SettingsData;
  onClose: () => void;
  onSave: (settings: SettingsData) => void;
}) {
  const [formData, setFormData] = useState<SettingsData>(settings);
  const [mounted, setMounted] = useState(open);
  const [selectedPreset, setSelectedPreset] = useState(CUSTOM_SCORING_VALUE);
  const [scoringTemplates, setScoringTemplates] = useState<ScoringRuleTemplate[]>([]);

  useEffect(() => {
    if (!open) return;
    setFormData(settings);
    setSelectedPreset(
      settings.scoringPresetId
        ? `${TEMPLATE_SCORING_PREFIX}${settings.scoringPresetId}`
        : CUSTOM_SCORING_VALUE,
    );
  }, [open, settings]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }

    const timeout = window.setTimeout(() => setMounted(false), 220);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    scoringRulesApi
      .getAll()
      .then((rules) => {
        if (!cancelled) setScoringTemplates(rules.map(apiScoringRuleToTemplate));
      })
      .catch(() => {
        if (!cancelled) setScoringTemplates([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const presetOptions = scoringTemplateOptions(scoringTemplates, formData.mode);

  useEffect(() => {
    if (!presetOptions.some((option) => option.value === selectedPreset)) {
      setSelectedPreset(CUSTOM_SCORING_VALUE);
    }
  }, [presetOptions, selectedPreset]);

  if (!mounted) return null;

  const updatePlacementPoint = (index: number, value: number) => {
    const newPoints = [...formData.placementPoints];
    newPoints[index] = value;
    setFormData({ ...formData, placementPoints: newPoints, scoringPresetId: null });
    setSelectedPreset(CUSTOM_SCORING_VALUE);
  };

  const applyPreset = (presetValue: string) => {
    setSelectedPreset(presetValue);
    if (presetValue === CUSTOM_SCORING_VALUE) {
      setFormData({ ...formData, scoringPresetId: null });
      return;
    }

    const templateId = presetValue.replace(TEMPLATE_SCORING_PREFIX, "");
    const template = scoringTemplates.find((item) => item.id === templateId);
    if (!template) return;

    setFormData(settingsFromScoringTemplate(template, formData));
  };

  const addPlacementPoint = () => {
    setFormData({
      ...formData,
      placementPoints: [...formData.placementPoints, 0],
      scoringPresetId: null,
    });
  };

  const removePlacementPoint = (index: number) => {
    const newPoints = formData.placementPoints.filter((_, i) => i !== index);
    setFormData({ ...formData, placementPoints: newPoints, scoringPresetId: null });
    setSelectedPreset(CUSTOM_SCORING_VALUE);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        hideCloseButton
        className="flex max-h-[90vh] w-full max-w-[600px] flex-col gap-0 overflow-hidden rounded-[16px] border border-[#e2e5ec] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.12)]"
      >
        <DialogTitle className="sr-only">Edit Scoring Rules</DialogTitle>
        <div className="flex items-center justify-between border-b border-[#f0f1f3] px-6 py-4">
          <h2 className="text-[18px] font-semibold text-[#000000]">Edit Scoring Rules</h2>
          <button
            onClick={onClose}
            className="rounded-[8px] p-2 text-[#9aa1b0] hover:bg-[#f7f8fb] hover:text-[#000000]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                Points per Kill
              </label>
              <input
                type="number"
                min={0}
                value={formData.killPoints}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    killPoints: Number(e.target.value),
                    scoringPresetId: null,
                  });
                  setSelectedPreset(CUSTOM_SCORING_VALUE);
                }}
                className="h-[40px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[14px] text-[#000000] outline-none focus:border-[#999]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                Scoring Preset
              </label>
              <AppSelect value={selectedPreset} onChange={applyPreset} options={presetOptions} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-5">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                Win Points
              </label>
              <input
                type="number"
                min={0}
                value={formData.winPoints}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    winPoints: Number(e.target.value),
                    scoringPresetId: null,
                  });
                  setSelectedPreset(CUSTOM_SCORING_VALUE);
                }}
                className="h-[40px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[14px] text-[#000000] outline-none focus:border-[#999]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                Draw Points
              </label>
              <input
                type="number"
                min={0}
                value={formData.drawPoints}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    drawPoints: Number(e.target.value),
                    scoringPresetId: null,
                  });
                  setSelectedPreset(CUSTOM_SCORING_VALUE);
                }}
                className="h-[40px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[14px] text-[#000000] outline-none focus:border-[#999]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#4b5563]">
                Loss Points
              </label>
              <input
                type="number"
                min={0}
                value={formData.lossPoints}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    lossPoints: Number(e.target.value),
                    scoringPresetId: null,
                  });
                  setSelectedPreset(CUSTOM_SCORING_VALUE);
                }}
                className="h-[40px] w-full rounded-[8px] border border-[#e2e5ec] bg-white px-3 text-[14px] text-[#000000] outline-none focus:border-[#999]"
              />
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="text-[13px] font-medium text-[#4b5563]">Placement Points</label>
              <button
                type="button"
                onClick={addPlacementPoint}
                className="flex cursor-pointer items-center gap-1.5 text-[13px] font-medium text-[#000000] hover:text-[#666666]"
              >
                <Plus className="h-4 w-4" /> Add placement
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {formData.placementPoints.map((points, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-[8px] border border-[#e2e5ec] bg-[#f9fbfc] p-2 focus-within:border-[#999]"
                >
                  <span className="w-8 text-[12px] font-medium text-[#666666]">#{index + 1}</span>
                  <input
                    type="number"
                    min={0}
                    value={points}
                    onChange={(e) => updatePlacementPoint(index, Number(e.target.value))}
                    className="h-[28px] min-w-0 flex-1 bg-transparent px-1 text-[13px] font-medium text-[#000000] outline-none"
                  />
                  {formData.placementPoints.length > 1 &&
                    index === formData.placementPoints.length - 1 && (
                      <button
                        onClick={() => removePlacementPoint(index)}
                        className="cursor-pointer rounded-[4px] p-1 text-[#9aa1b0] transition-colors hover:bg-[#fee2e2] hover:text-[#ef4444]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#f0f1f3] bg-[#fcfdfd] px-6 py-4">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-[8px] border border-[#e2e5ec] px-4 py-2 text-[13px] font-medium text-[#666666] hover:bg-[#f7f8fb]"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="cursor-pointer rounded-[8px] bg-[#000000] px-5 py-2 text-[13px] font-medium text-white hover:bg-[#333]"
          >
            Save Rules
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
