import { pageMeta } from "@/lib/route-meta";
import { useEffect, useState, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Clock3,
  FileClock,
  Hash,
  ListChecks,
  LogIn,
  Mail,
  ShieldCheck,
  Swords,
  UserRound,
  Users,
} from "lucide-react";
import { AppDropdownMenu } from "@/components/dashboard/AppDropdownMenu";
import { SoftwareHeader } from "@/components/dashboard/SoftwareHeader";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { queue } from "@/components/ui/Toast";
import { GlobalPageLoader } from "@/components/ui/GlobalPageLoader";
import {
  adminApi,
  type ApiEvent,
  type ApiScoringRule,
  type ApiTeam,
  type ApiUser,
  type ApiUserLog,
  type ApiUserLogCategory,
} from "@/lib/api";

export const Route = createFileRoute("/admin/users/$userId")({
  head: () => pageMeta('User details', 'Review account details and activity for an Esportific user.'),
  component: AdminUserDetailPage,
});

type AdminUserDetail = ApiUser & {
  stats?: {
    eventsCount: number;
    teamsCount: number;
  };
};

const LOG_OPTIONS: Array<{
  type: ApiUserLogCategory;
  label: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    type: "login",
    label: "Login logs",
    description: "Sign in, sign out, IP, device",
    icon: <LogIn className="h-4 w-4" />,
  },
  {
    type: "activity",
    label: "Activity logs",
    description: "Events, teams, scoring templates",
    icon: <ListChecks className="h-4 w-4" />,
  },
  {
    type: "account",
    label: "Account logs",
    description: "Profile, email, password changes",
    icon: <ShieldCheck className="h-4 w-4" />,
  },
];

function emptyLogRows(): Record<ApiUserLogCategory, ApiUserLog[]> {
  return { login: [], activity: [], account: [] };
}

function emptyLoadedLogs(): Record<ApiUserLogCategory, boolean> {
  return { login: false, activity: false, account: false };
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatLogValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "empty";
  if (Array.isArray(value)) return value.length > 0 ? value.map(formatLogValue).join(", ") : "none";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "updated value";
    }
  }
  return String(value);
}

function fallbackChangeMessage(change: ApiUserLog["changes"][number]) {
  if (change.message) return change.message;
  if (change.type === "added") return `Added ${change.label}: ${formatLogValue(change.newValue)}.`;
  if (change.type === "removed")
    return `Deleted ${change.label}: ${formatLogValue(change.previousValue)}.`;
  return `Changed ${change.label} from ${formatLogValue(change.previousValue)} to ${formatLogValue(change.newValue)}.`;
}

function avatarInitial(user: ApiUser) {
  return (user.name || user.email || "U").slice(0, 1).toUpperCase();
}

function eventGameName(event: ApiEvent) {
  if (event.gameId && typeof event.gameId === "object" && "name" in event.gameId) {
    return event.gameId.name;
  }
  return event.game || "-";
}

function scoringRuleGameName(rule: ApiScoringRule) {
  if (rule.gameId && typeof rule.gameId === "object" && "name" in rule.gameId) {
    return rule.gameId.name;
  }
  if (rule.gameName) return rule.gameName;
  return rule.isGeneric ? "Generic" : "-";
}

function scoringRuleFormat(value?: string) {
  return String(value || "-")
    .split("_")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function teamLogoInitial(team: ApiTeam) {
  return (team.name || "T").slice(0, 1).toUpperCase();
}

function actionButtonClass(active: boolean) {
  return [
    "inline-flex h-8 items-center gap-2 rounded-[5px] border px-3 text-[12px] font-semibold transition-colors",
    active
      ? "border-[#000000] bg-[#000000] text-white"
      : "border-[#e2e5ec] bg-white text-[#4b5563] hover:border-[#c8ccd5] hover:bg-[#f7f8fb] hover:text-[#000000]",
  ].join(" ");
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-5 border-b border-[#f0f1f3] px-5 py-3.5 last:border-b-0">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-[#9aa1b0]">
        {icon}
        {label}
      </div>
      <div className="min-w-0 text-[13px] font-medium text-[#000000]">{value}</div>
    </div>
  );
}

function StatRow({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#f0f1f3] px-5 py-3.5 last:border-b-0">
      <div className="flex items-center gap-2 text-[12px] font-medium text-[#666666]">
        {icon}
        {label}
      </div>
      <p className="text-[15px] font-semibold text-[#000000]">{value}</p>
    </div>
  );
}

function PanelTitle({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#f0f1f3] px-6 py-3">
      <h2 className="text-[14px] font-semibold text-[#000000]">{title}</h2>
      {meta ? <span className="text-[12px] font-medium text-[#9aa1b0]">{meta}</span> : null}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-[14px] font-semibold text-[#000000]">{title}</p>
      {description ? <p className="mt-1 text-[13px] text-[#666666]">{description}</p> : null}
    </div>
  );
}

function ProfilePanel({ user }: { user: AdminUserDetail }) {
  return (
    <>
      <PanelTitle title="Account Information" />
      <DetailRow icon={<UserRound className="h-4 w-4" />} label="Name" value={user.name} />
      <DetailRow
        icon={<Mail className="h-4 w-4" />}
        label="Email ID"
        value={<span className="break-all">{user.email}</span>}
      />
      <DetailRow
        icon={<CalendarDays className="h-4 w-4" />}
        label="Account Created"
        value={formatDateTime(user.createdAt)}
      />
      <DetailRow
        icon={<Clock3 className="h-4 w-4" />}
        label="Last Updated"
        value={formatDateTime(user.updatedAt)}
      />
      <DetailRow
        icon={<Hash className="h-4 w-4" />}
        label="User ID"
        value={<span className="break-all text-[#4b5563]">{user._id}</span>}
      />

      <PanelTitle title="Platform Activity" />
      <StatRow
        label="Events created"
        value={user.stats?.eventsCount ?? 0}
        icon={<Swords className="h-4 w-4 text-[#9aa1b0]" />}
      />
      <StatRow
        label="Teams created"
        value={user.stats?.teamsCount ?? 0}
        icon={<Users className="h-4 w-4 text-[#9aa1b0]" />}
      />
    </>
  );
}

function EventsModal({
  open,
  events,
  loading,
  onOpenChange,
  onOpenEvent,
  userName,
}: {
  open: boolean;
  events: ApiEvent[];
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenEvent: (eventId: string) => void;
  userName: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[80vh] w-[85vw] max-w-[1200px] flex-col gap-0 overflow-hidden rounded-[16px] border border-[#e2e5ec] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
        <DialogTitle className="sr-only">User events</DialogTitle>
        <div className="flex items-center justify-between gap-4 border-b border-[#f0f1f3] px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-[18px] font-semibold text-[#000000]">Events</h2>
            <p className="mt-0.5 text-[13px] text-[#666666]">
              {loading ? "Loading events..." : `${events.length} events created by ${userName}`}
            </p>
          </div>
        </div>
        {loading ? (
          <GlobalPageLoader label="Loading events" variant="section" />
        ) : events.length === 0 ? (
          <EmptyState
            title="No events created yet"
            description="This user has not created any events."
          />
        ) : (
          <div className="min-h-0 overflow-auto">
            <table className="w-full min-w-[820px] table-fixed border-collapse text-left">
              <thead className="sticky top-0 bg-[#fafafa] text-[11px] font-medium uppercase tracking-wide text-[#8a93a3]">
                <tr>
                  <th className="w-[34%] px-4 py-2.5">Event</th>
                  <th className="w-[18%] px-4 py-2.5">Game</th>
                  <th className="w-[13%] px-4 py-2.5">Status</th>
                  <th className="w-[10%] px-4 py-2.5">Teams</th>
                  <th className="w-[10%] px-4 py-2.5">Matches</th>
                  <th className="w-[15%] px-4 py-2.5">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f1f3] text-[13px]">
                {events.map((event) => (
                  <tr
                    key={event._id}
                    onClick={() => onOpenEvent(event._id)}
                    className="cursor-pointer hover:bg-[#f7f8fb]"
                  >
                    <td className="px-4 py-3 font-medium text-[#000000]">
                      <span className="block truncate text-[14px]">{event.name}</span>
                    </td>
                    <td className="truncate px-4 py-3 text-[12px] text-[#4b5563]">
                      {eventGameName(event)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full border border-[#e2e5ec] px-2 py-0.5 text-[11px] font-semibold text-[#4b5563]">
                        {event.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#4b5563]">
                      {event.teams?.length ?? 0}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#4b5563]">
                      {event.matchCount ?? 0}
                    </td>
                    <td className="truncate px-4 py-3 text-[12px] text-[#4b5563]">
                      {formatDateTime(event.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TeamsModal({
  open,
  teams,
  loading,
  onOpenChange,
  userName,
}: {
  open: boolean;
  teams: ApiTeam[];
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[80vh] w-[85vw] max-w-[1100px] flex-col gap-0 overflow-hidden rounded-[16px] border border-[#e2e5ec] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
        <DialogTitle className="sr-only">User teams pool</DialogTitle>
        <div className="flex items-center justify-between gap-4 border-b border-[#f0f1f3] px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-[18px] font-semibold text-[#000000]">Teams Pool</h2>
            <p className="mt-0.5 text-[13px] text-[#666666]">
              {loading ? "Loading teams..." : `${teams.length} pool teams created by ${userName}`}
            </p>
          </div>
        </div>
        {loading ? (
          <GlobalPageLoader label="Loading teams" variant="section" />
        ) : teams.length === 0 ? (
          <EmptyState
            title="No pool teams found"
            description="This user has not added teams to their teams pool."
          />
        ) : (
          <div className="min-h-0 overflow-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead className="sticky top-0 bg-[#fafafa] text-[11px] uppercase tracking-wider text-[#9aa1b0]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Team</th>
                  <th className="px-5 py-3 font-semibold">Mobile</th>
                  <th className="px-5 py-3 font-semibold">Players</th>
                  <th className="px-5 py-3 font-semibold">Tags</th>
                  <th className="px-5 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f1f3] text-[13px]">
                {teams.map((team) => (
                  <tr key={team._id} className="hover:bg-[#f7f8fb]">
                    <td className="max-w-[320px] px-5 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f0f1f3] text-[12px] font-semibold text-[#4b5563]">
                          {team.logoUrl ? (
                            <img
                              src={team.logoUrl}
                              alt={team.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            teamLogoInitial(team)
                          )}
                        </div>
                        <span className="truncate font-semibold text-[#000000]">{team.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[#4b5563]">{team.contactMobile || "-"}</td>
                    <td className="px-5 py-3 text-[#4b5563]">{team.players?.length ?? 0}</td>
                    <td className="px-5 py-3 text-[#4b5563]">
                      {team.tags?.length ? team.tags.join(", ") : "-"}
                    </td>
                    <td className="px-5 py-3 text-[#4b5563]">{formatDateTime(team.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ScoringRulesModal({
  open,
  rules,
  loading,
  onOpenChange,
  userName,
}: {
  open: boolean;
  rules: ApiScoringRule[];
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[80vh] w-[85vw] max-w-[1100px] flex-col gap-0 overflow-hidden rounded-[16px] border border-[#e2e5ec] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
        <DialogTitle className="sr-only">User scoring rules</DialogTitle>
        <div className="flex items-center justify-between gap-4 border-b border-[#f0f1f3] px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-[18px] font-semibold text-[#000000]">Scoring Rules</h2>
            <p className="mt-0.5 text-[13px] text-[#666666]">
              {loading
                ? "Loading scoring rules..."
                : `${rules.length} scoring rules created by ${userName}`}
            </p>
          </div>
        </div>
        {loading ? (
          <GlobalPageLoader label="Loading scoring rules" variant="section" />
        ) : rules.length === 0 ? (
          <EmptyState
            title="No scoring rules found"
            description="This user has not created custom scoring rules."
          />
        ) : (
          <div className="min-h-0 overflow-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead className="sticky top-0 bg-[#fafafa] text-[11px] uppercase tracking-wider text-[#9aa1b0]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Rule</th>
                  <th className="px-5 py-3 font-semibold">Game</th>
                  <th className="px-5 py-3 font-semibold">Format</th>
                  <th className="px-5 py-3 font-semibold">Kill pts</th>
                  <th className="px-5 py-3 font-semibold">Fields</th>
                  <th className="px-5 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f1f3] text-[13px]">
                {rules.map((rule) => (
                  <tr key={rule._id} className="hover:bg-[#f7f8fb]">
                    <td className="max-w-[280px] px-5 py-3 font-semibold text-[#000000]">
                      <span className="block truncate">{rule.name}</span>
                    </td>
                    <td className="px-5 py-3 text-[#4b5563]">{scoringRuleGameName(rule)}</td>
                    <td className="px-5 py-3 text-[#4b5563]">{scoringRuleFormat(rule.format)}</td>
                    <td className="px-5 py-3 text-[#4b5563]">{rule.killPoints ?? 0}</td>
                    <td className="max-w-[260px] px-5 py-3 text-[#4b5563]">
                      <span className="block truncate">
                        {rule.scoringFields?.length
                          ? rule.scoringFields.map(scoringRuleFormat).join(", ")
                          : "-"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[#4b5563]">{formatDateTime(rule.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function UserLogsPanel({
  category,
  logs,
  loading,
}: {
  category: ApiUserLogCategory;
  logs: ApiUserLog[];
  loading: boolean;
}) {
  const label = LOG_OPTIONS.find((option) => option.type === category)?.label || "Logs";

  return (
    <>
      <PanelTitle title={label} meta={loading ? "Loading" : `${logs.length} total`} />
      {loading ? (
        <GlobalPageLoader label="Loading logs" variant="section" />
      ) : logs.length === 0 ? (
        <EmptyState
          title="No logs found"
          description="Nothing has been recorded for this section yet."
        />
      ) : (
        <div className="divide-y divide-[#f0f1f3]">
          {logs.map((log) => (
            <div key={log._id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-semibold text-[#000000]">{log.message}</p>
                    <span className="rounded-full bg-[#f4f4f5] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#71717a]">
                      {log.action.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-[#666666]">
                    User: <span className="font-medium text-[#000000]">{log.userName}</span>{" "}
                    <span className="break-all text-[#9aa1b0]">({log.userId})</span>
                  </p>
                </div>
                <div className="shrink-0 text-right text-[12px] font-medium text-[#666666]">
                  {formatDateTime(log.createdAt)}
                </div>
              </div>

              {category === "login" ? (
                <div className="mt-3 grid grid-cols-1 gap-2 text-[12px] text-[#4b5563] sm:grid-cols-3">
                  <span className="truncate rounded-[5px] bg-[#fafafa] px-2.5 py-2">
                    Device: {log.device || "Unknown device"}
                  </span>
                  <span className="truncate rounded-[5px] bg-[#fafafa] px-2.5 py-2">
                    IP: {log.ipAddress || "Unknown IP"}
                  </span>
                  <span className="truncate rounded-[5px] bg-[#fafafa] px-2.5 py-2">
                    Location: {log.location || "Unknown location"}
                  </span>
                </div>
              ) : null}

              {log.changes?.length ? (
                <div className="mt-3 space-y-1.5">
                  {log.changes.map((change, index) => (
                    <p
                      key={`${log._id}-${change.field}-${index}`}
                      className="rounded-[5px] bg-[#fafafa] px-2.5 py-2 text-[12px] text-[#4b5563]"
                    >
                      {fallbackChangeMessage(change)}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function LogsModal({
  open,
  category,
  logs,
  loading,
  userName,
  onOpenChange,
}: {
  open: boolean;
  category: ApiUserLogCategory | null;
  logs: ApiUserLog[];
  loading: boolean;
  userName: string;
  onOpenChange: (open: boolean) => void;
}) {
  const label = category
    ? LOG_OPTIONS.find((option) => option.type === category)?.label || "Logs"
    : "Logs";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[80vh] w-[85vw] max-w-[1100px] flex-col gap-0 overflow-hidden rounded-[16px] border border-[#e2e5ec] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
        <DialogTitle className="sr-only">{label}</DialogTitle>
        <div className="flex items-center justify-between gap-4 border-b border-[#f0f1f3] px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-[18px] font-semibold text-[#000000]">{label}</h2>
            <p className="mt-0.5 text-[13px] text-[#666666]">
              {loading ? "Loading logs..." : `${logs.length} records for ${userName}`}
            </p>
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto">
          {category ? (
            <UserLogsPanel category={category} logs={logs} loading={loading} />
          ) : (
            <EmptyState title="Select a log type" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AdminUserDetailPage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsModalOpen, setEventsModalOpen] = useState(false);
  const [teams, setTeams] = useState<ApiTeam[]>([]);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsModalOpen, setTeamsModalOpen] = useState(false);
  const [scoringRules, setScoringRules] = useState<ApiScoringRule[]>([]);
  const [scoringRulesLoaded, setScoringRulesLoaded] = useState(false);
  const [scoringRulesLoading, setScoringRulesLoading] = useState(false);
  const [scoringRulesModalOpen, setScoringRulesModalOpen] = useState(false);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [activeLogType, setActiveLogType] = useState<ApiUserLogCategory | null>(null);
  const [logs, setLogs] = useState<Record<ApiUserLogCategory, ApiUserLog[]>>(emptyLogRows);
  const [logsLoaded, setLogsLoaded] =
    useState<Record<ApiUserLogCategory, boolean>>(emptyLoadedLogs);
  const [loadingLogType, setLoadingLogType] = useState<ApiUserLogCategory | null>(null);

  useEffect(() => {
    setLoading(true);
    setUser(null);
    setEvents([]);
    setEventsLoaded(false);
    setEventsLoading(false);
    setEventsModalOpen(false);
    setTeams([]);
    setTeamsLoaded(false);
    setTeamsLoading(false);
    setTeamsModalOpen(false);
    setScoringRules([]);
    setScoringRulesLoaded(false);
    setScoringRulesLoading(false);
    setScoringRulesModalOpen(false);
    setLogsModalOpen(false);
    setActiveLogType(null);
    setLogs(emptyLogRows());
    setLogsLoaded(emptyLoadedLogs());
    setLoadingLogType(null);

    adminApi
      .getUserById(userId)
      .then(setUser)
      .catch((err) => {
        queue.add(
          {
            title: "Could not load user",
            description: err instanceof Error ? err.message : "Unknown error",
            variant: "error",
          },
          { timeout: 5000 },
        );
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const showEvents = async () => {
    setEventsModalOpen(true);
    if (eventsLoaded || eventsLoading) return;
    setEventsLoading(true);
    try {
      const rows = await adminApi.getUserEvents(userId);
      setEvents(rows);
      setEventsLoaded(true);
    } catch (err) {
      queue.add(
        {
          title: "Could not load events",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "error",
        },
        { timeout: 5000 },
      );
    } finally {
      setEventsLoading(false);
    }
  };

  const showTeams = async () => {
    setTeamsModalOpen(true);
    if (teamsLoaded || teamsLoading) return;
    setTeamsLoading(true);
    try {
      const rows = await adminApi.getUserTeams(userId);
      setTeams(rows);
      setTeamsLoaded(true);
    } catch (err) {
      queue.add(
        {
          title: "Could not load teams",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "error",
        },
        { timeout: 5000 },
      );
    } finally {
      setTeamsLoading(false);
    }
  };

  const showScoringRules = async () => {
    setScoringRulesModalOpen(true);
    if (scoringRulesLoaded || scoringRulesLoading) return;
    setScoringRulesLoading(true);
    try {
      const rows = await adminApi.getUserScoringRules(userId);
      setScoringRules(rows);
      setScoringRulesLoaded(true);
    } catch (err) {
      queue.add(
        {
          title: "Could not load scoring rules",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "error",
        },
        { timeout: 5000 },
      );
    } finally {
      setScoringRulesLoading(false);
    }
  };

  const showLogType = async (type: ApiUserLogCategory) => {
    setActiveLogType(type);
    setLogsModalOpen(true);
    if (logsLoaded[type] || loadingLogType === type) return;
    setLoadingLogType(type);
    try {
      const rows = await adminApi.getUserLogs(userId, type);
      setLogs((current) => ({ ...current, [type]: rows }));
      setLogsLoaded((current) => ({ ...current, [type]: true }));
    } catch (err) {
      queue.add(
        {
          title: "Could not load logs",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "error",
        },
        { timeout: 5000 },
      );
    } finally {
      setLoadingLogType(null);
    }
  };

  return (
    <>
      <SoftwareHeader title="User details" variant="admin" />
      <main className="min-h-0 flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-[980px]">
          <Link
            to="/admin/users"
            className="mb-6 inline-flex items-center gap-2 text-[13px] font-medium text-[#666666] transition-colors hover:text-[#000000]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Users
          </Link>

          {loading ? (
            <div className="rounded-[10px] border border-dashed border-[#d1d5db] bg-white py-20 text-center">
              <GlobalPageLoader label="Loading user" variant="section" />
            </div>
          ) : !user ? (
            <div className="rounded-[10px] border border-dashed border-[#d1d5db] bg-white py-20 text-center">
              <p className="text-[15px] font-semibold text-[#000000]">User not found</p>
              <p className="mt-1 text-[14px] text-[#666666]">This user may no longer exist.</p>
            </div>
          ) : (
            <div className="overflow-visible rounded-[10px] border border-[#e2e5ec] bg-white">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f0f1f3] px-6 py-5">
                <button className="flex min-w-0 items-center gap-4 text-left">
                  <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f0f1f3] text-[18px] font-semibold text-[#4b5563]">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      avatarInitial(user)
                    )}
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-[20px] font-semibold text-[#000000]">
                      {user.name}
                    </h1>
                    <p className="mt-0.5 truncate text-[13px] text-[#666666]">{user.email}</p>
                  </div>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void showEvents()}
                    className={actionButtonClass(eventsModalOpen)}
                  >
                    <Swords className="h-4 w-4" />
                    Events
                  </button>
                  <button
                    type="button"
                    onClick={() => void showTeams()}
                    className={actionButtonClass(teamsModalOpen)}
                  >
                    <Users className="h-4 w-4" />
                    Teams
                  </button>
                  <button
                    type="button"
                    onClick={() => void showScoringRules()}
                    className={actionButtonClass(scoringRulesModalOpen)}
                  >
                    <ListChecks className="h-4 w-4" />
                    Scoring rules
                  </button>

                  <AppDropdownMenu
                    widthClass="w-[260px]"
                    trigger={
                      <button type="button" className={actionButtonClass(logsModalOpen)}>
                        <FileClock className="h-4 w-4" />
                        Logs
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    }
                    items={LOG_OPTIONS.map((option) => ({
                      label: option.label,
                      icon: option.icon,
                      onSelect: () => void showLogType(option.type),
                    }))}
                  />
                </div>
              </div>

              <ProfilePanel user={user} />
            </div>
          )}
        </div>
      </main>
      {user && eventsModalOpen ? (
        <EventsModal
          open={eventsModalOpen}
          events={events}
          loading={eventsLoading}
          userName={user.name}
          onOpenChange={setEventsModalOpen}
          onOpenEvent={(eventId) => {
            setEventsModalOpen(false);
            void navigate({ to: "/events/$eventId", params: { eventId } });
          }}
        />
      ) : null}
      {user && teamsModalOpen ? (
        <TeamsModal
          open={teamsModalOpen}
          teams={teams}
          loading={teamsLoading}
          userName={user.name}
          onOpenChange={setTeamsModalOpen}
        />
      ) : null}
      {user && scoringRulesModalOpen ? (
        <ScoringRulesModal
          open={scoringRulesModalOpen}
          rules={scoringRules}
          loading={scoringRulesLoading}
          userName={user.name}
          onOpenChange={setScoringRulesModalOpen}
        />
      ) : null}
      {user ? (
        <LogsModal
          open={logsModalOpen}
          category={activeLogType}
          logs={activeLogType ? logs[activeLogType] : []}
          loading={activeLogType ? loadingLogType === activeLogType : false}
          userName={user.name}
          onOpenChange={setLogsModalOpen}
        />
      ) : null}
    </>
  );
}
