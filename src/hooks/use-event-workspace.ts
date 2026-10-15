import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  eventsApi,
  matchesApi,
  teamsApi,
  type ApiEvent,
  type ApiLeaderboardRow,
  type ApiMatch,
  type ApiTeam,
} from "@/lib/api";
import type { ResultEntry } from "@/components/dashboard/AddResultModal";
import type { MatchInput } from "@/components/dashboard/AddMatchModal";
import type { EditableMatch } from "@/components/dashboard/EditMatchModal";
import {
  apiMatchResultsToEntries,
  apiTeamsToTeamData,
  formatEventDate,
  getEventGame,
  leaderboardToStandingsPreview,
  resultEntriesToPayload,
} from "@/lib/mappers";

export type WorkspaceMatch = {
  id: string;
  name: string;
  map: string;
  status: "Pending Results" | "Completed";
  results: ResultEntry[];
  order: number;
};

export type WorkspaceEventTeam = {
  id: string;
  slot: string;
  name: string;
  tags: string[];
  players: string[];
  logo?: string | null;
};

export function useEventWorkspace(eventId: string) {
  const [initialEvent] = useState(() => eventsApi.getCachedById(eventId) ?? null);
  const [initialMatches] = useState(() => matchesApi.getCachedByEvent(eventId) ?? null);
  const [initialLeaderboard] = useState(() => matchesApi.getCachedLeaderboard(eventId) ?? null);
  const [event, setEvent] = useState<ApiEvent | null>(initialEvent);
  const [matches, setMatches] = useState<WorkspaceMatch[]>(() => (initialMatches || []).map((m) => ({
    id: m._id,
    name: m.name,
    map: m.map || "",
    status: m.status,
    results: m.status === "Completed" ? apiMatchResultsToEntries(m.results || []) : [],
    order: m.order ?? 0,
  })));
  const [leaderboard, setLeaderboard] = useState<ApiLeaderboardRow[]>(initialLeaderboard || []);
  const [poolTeams, setPoolTeams] = useState<ApiTeam[]>([]);
  const [poolTeamsLoading, setPoolTeamsLoading] = useState(false);
  const poolTeamsLoaded = useRef(false);
  const poolTeamsRequest = useRef<Promise<void> | null>(null);
  const [loading, setLoading] = useState(!(initialEvent && initialMatches && initialLeaderboard));
  const [error, setError] = useState<string | null>(null);

  const eventTeams = useMemo((): ApiTeam[] => {
    if (!event?.teams) return [];
    return event.teams.filter((t): t is ApiTeam => typeof t !== "string");
  }, [event]);

  const matchTeamsData = useMemo(() => apiTeamsToTeamData(eventTeams), [eventTeams]);

  const refreshLeaderboard = useCallback(async () => {
    const rows = await matchesApi.getLeaderboard(eventId);
    setLeaderboard(rows);
  }, [eventId]);

  const loadPoolTeams = useCallback(async () => {
    if (poolTeamsLoaded.current) return;
    if (poolTeamsRequest.current) return poolTeamsRequest.current;
    setPoolTeamsLoading(true);
    const request = teamsApi.getAll()
      .then((rows) => {
        setPoolTeams(rows);
        poolTeamsLoaded.current = true;
      })
      .finally(() => {
        setPoolTeamsLoading(false);
        poolTeamsRequest.current = null;
      });
    poolTeamsRequest.current = request;
    return request;
  }, []);

  const loadMatchResults = useCallback(async (matchList: ApiMatch[]) => {
    const withResults = matchList.map((m) => ({
      id: m._id,
      name: m.name,
      map: m.map || "",
      status: m.status,
      results: m.status === "Completed" ? apiMatchResultsToEntries(m.results || []) : [],
      order: m.order ?? 0,
    } satisfies WorkspaceMatch));
    setMatches(withResults);
  }, []);

  const refresh = useCallback(async () => {
    const hasCachedWorkspace = Boolean(
      eventsApi.getCachedById(eventId) &&
      matchesApi.getCachedByEvent(eventId) &&
      matchesApi.getCachedLeaderboard(eventId),
    );
    setLoading(!hasCachedWorkspace);
    setError(null);
    try {
      const [eventData, matchList, board] = await Promise.all([
        eventsApi.getById(eventId),
        matchesApi.getByEvent(eventId),
        matchesApi.getLeaderboard(eventId),
      ]);
      setEvent(eventData);
      setLeaderboard(board);
      await loadMatchResults(matchList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load event");
    } finally {
      setLoading(false);
    }
  }, [eventId, loadMatchResults]);

  const refreshStandings = useCallback(async () => {
    const [matchList, board] = await Promise.all([
      matchesApi.getByEvent(eventId),
      matchesApi.getLeaderboard(eventId),
    ]);
    setLeaderboard(board);
    await loadMatchResults(matchList);
  }, [eventId, loadMatchResults]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const workspaceTeams: WorkspaceEventTeam[] = useMemo(
    () =>
      eventTeams.map((team, index) => ({
        id: team._id,
        slot: String(index + 1).padStart(2, "0"),
        name: team.name,
        tags: team.tags || [],
        players: (team.players || []).map((p) => p.name),
        logo: team.logoUrl || null,
      })),
    [eventTeams],
  );

  const updateEventTeams = async (teamIds: string[]) => {
    const updated = await eventsApi.update(eventId, { teams: teamIds });
    setEvent(updated);
    await refreshLeaderboard();
  };

  const addMatch = async (input: MatchInput) => {
    const created = await matchesApi.create({
      eventId,
      name: input.name,
      map: input.map,
      order: matches.length,
    });
    setMatches((current) => [
      ...current,
      {
        id: created._id,
        name: created.name,
        map: created.map || "",
        status: created.status,
        results: [],
        order: created.order ?? current.length,
      },
    ]);
  };

  const addMatches = async (inputs: MatchInput[]) => {
    const startOrder = matches.length;
    const createdMatches: WorkspaceMatch[] = [];
    for (let i = 0; i < inputs.length; i++) {
      const created = await matchesApi.create({
        eventId,
        name: inputs[i].name,
        map: inputs[i].map,
        order: startOrder + i,
      });
      createdMatches.push({
        id: created._id,
        name: created.name,
        map: created.map || "",
        status: created.status,
        results: [],
        order: created.order ?? startOrder + i,
      });
    }
    setMatches((current) => [...current, ...createdMatches]);
  };

  const saveMatch = async (updated: EditableMatch & { id: string }) => {
    await matchesApi.update(updated.id, {
      name: updated.name,
      map: updated.map,
    });
    setMatches((current) =>
      current.map((m) =>
        m.id === updated.id
          ? { ...m, name: updated.name, map: updated.map }
          : m,
      ),
    );
  };

  const deleteMatch = async (matchId: string) => {
    await matchesApi.delete(matchId);
    setMatches((current) => current.filter((m) => m.id !== matchId));
    await refreshLeaderboard();
  };

  const persistMatchResults = async (matchId: string, results: ResultEntry[]) => {
    const payload = resultEntriesToPayload(results);
    await matchesApi.saveResults(matchId, payload);
    setMatches((current) =>
      current.map((m) =>
        m.id === matchId
          ? { ...m, results, status: "Completed" as const }
          : m,
      ),
    );
    await refreshLeaderboard();
  };

  const standingsPreview = useMemo(
    () => leaderboardToStandingsPreview(leaderboard),
    [leaderboard],
  );

  const displayEvent = useMemo(() => {
    if (!event) return null;
    const game = getEventGame(event);
    return {
      id: event._id,
      name: event.name,
      game: game.name,
      gameLogo: game.logo,
      format: event.format || "—",
      date: formatEventDate(event.startDate, event.endDate),
      teamsCount: eventTeams.length,
      status: event.status,
    };
  }, [event, eventTeams.length]);

  return {
    event,
    eventTeams,
    displayEvent,
    matches,
    leaderboard,
    standingsPreview,
    matchTeamsData,
    workspaceTeams,
    poolTeams,
    poolTeamsLoading,
    loading,
    error,
    refresh,
    refreshLeaderboard,
    refreshStandings,
    loadPoolTeams,
    updateEventTeams,
    addMatch,
    addMatches,
    saveMatch,
    deleteMatch,
    persistMatchResults,
    setEvent,
  };
}
