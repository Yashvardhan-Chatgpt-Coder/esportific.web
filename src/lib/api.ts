/**
 * API service layer for communicating with the backend.
 */

import type { GameFormat, ScoringFieldKey } from "@/lib/tournament-formats";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const responseCache = new Map<string, unknown>();
const pendingGetRequests = new Map<string, Promise<unknown>>();
let cacheRevision = 0;

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function getCacheKey(path: string): string {
  return `${API_BASE}:${getToken() || "anonymous"}:${path}`;
}

export function getCachedApiResponse<T>(path: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  return responseCache.get(getCacheKey(path)) as T | undefined;
}

function clearApiResponseCache(): void {
  cacheRevision += 1;
  responseCache.clear();
  pendingGetRequests.clear();
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const canCache = method === "GET" && typeof window !== "undefined";
  const cacheKey = getCacheKey(path);
  if (canCache) {
    if (responseCache.has(cacheKey)) return responseCache.get(cacheKey) as T;
    const pending = pendingGetRequests.get(cacheKey);
    if (pending) return pending as Promise<T>;
  }
  const requestRevision = cacheRevision;

  const isFormData = options.body instanceof FormData;
  const headers = authHeaders(isFormData ? {} : { "Content-Type": "application/json" });

  const requestPromise = (async () => {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { ...headers, ...(options.headers as Record<string, string>) },
    });

    if (res.status === 401 && typeof window !== "undefined") {
      // A failed request must not silently sign the user out. Keep their local
      // session so transient/server-side authorization failures do not redirect
      // them to the login screen; explicit logout clears it in SoftwareHeader.
      clearApiResponseCache();
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message =
        (body as { message?: string; error?: string }).message ||
        (body as { message?: string; error?: string }).error ||
        `Request failed: ${res.status}`;
      throw new Error(message);
    }

    const data = await res.json() as T;
    if (canCache && requestRevision === cacheRevision) responseCache.set(cacheKey, data);
    else clearApiResponseCache();
    return data;
  })();

  if (canCache) {
    pendingGetRequests.set(cacheKey, requestPromise);
    try {
      return await requestPromise;
    } finally {
      if (pendingGetRequests.get(cacheKey) === requestPromise) pendingGetRequests.delete(cacheKey);
    }
  }
  return requestPromise;
}

// ---------- Auth / user ----------

export interface ApiUser {
  _id: string;
  name: string;
  email: string;
  avatar?: string | null;
  phone?: string;
  dob?: string | null;
  gender?: string;
  timezone?: string;
  organization?: {
    name?: string;
    logo?: string;
  };
  appearanceMode?: "system" | "light" | "dark";
  integrations?: {
    discordWebhookUrl?: string;
    twitchChannelUrl?: string;
  };
  role: "organizer" | "admin";
  createdAt?: string;
  updatedAt?: string;
  token?: string;
  avatarFile?: File | null;
  organizationLogoFile?: File | null;
}

export const authApi = {
  sendOtp: (email: string) =>
    request<{ message: string }>("/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  register: (data: { name: string; email: string; password: string; otp: string }) =>
    request<ApiUser>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    request<ApiUser>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  adminLogin: (data: { email: string; password: string }) =>
    request<ApiUser>("/auth/admin/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  googleLogin: (credential: string, intent: "login" | "signup") =>
    request<ApiUser>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential, intent }),
    }),
  getProfile: () => request<ApiUser>("/auth/profile"),
  updateProfile: (data: Partial<ApiUser>) => {
    if (data.avatarFile || data.organizationLogoFile) {
      const form = new FormData();
      if (data.name !== undefined) form.append("name", data.name);
      if (data.email !== undefined) form.append("email", data.email);
      if (data.phone !== undefined) form.append("phone", data.phone || "");
      if (data.dob !== undefined) form.append("dob", data.dob || "");
      if (data.gender !== undefined) form.append("gender", data.gender || "");
      if (data.timezone !== undefined) form.append("timezone", data.timezone || "");
      if (data.organization !== undefined)
        form.append("organization", JSON.stringify(data.organization));
      if (data.appearanceMode !== undefined)
        form.append("appearanceMode", data.appearanceMode || "system");
      if (data.integrations !== undefined)
        form.append("integrations", JSON.stringify(data.integrations));
      if (data.avatarFile) form.append("avatar", data.avatarFile);
      if (data.organizationLogoFile) form.append("organizationLogo", data.organizationLogoFile);
      return request<ApiUser>("/auth/profile", { method: "PUT", body: form });
    }
    const { avatarFile, organizationLogoFile, ...payload } = data;
    return request<ApiUser>("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  updatePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>("/auth/password", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  logout: () =>
    request<{ message: string }>("/auth/logout", {
      method: "POST",
    }),
};

export function persistUser(user: ApiUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem("user", JSON.stringify(user));
  if (user.token) localStorage.setItem("token", user.token);
  window.dispatchEvent(new CustomEvent("esports:user-updated", { detail: user }));
}

export function getStoredUser(): ApiUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as ApiUser) : null;
  } catch {
    return null;
  }
}

export function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) || "U").toUpperCase();
}

// ---------- Types matching backend models ----------

export interface ApiPlayer {
  playerId: string;
  name: string;
  inGameId?: string;
}

export interface ApiTeam {
  _id: string;
  name: string;
  logoUrl?: string;
  tags: string[];
  contactMobile?: string;
  notes?: string;
  players: ApiPlayer[];
  isPoolTeam?: boolean;
  source?: "pool" | "event";
  sourceEventId?: string | null;
  sourceEventName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiEvent {
  _id: string;
  name: string;
  gameId?: ApiCatalogGame | string | null;
  game: string;
  format: string;
  startDate?: string;
  endDate?: string;
  status: "Draft" | "Ongoing" | "Completed";
  organizerId?: Pick<ApiUser, "_id" | "name" | "email"> | string | null;
  scoringRuleId?: ApiScoringRule | string | null;
  teams: (ApiTeam | string)[];
  matchCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiScoringRule {
  _id: string;
  name: string;
  format?: string;
  gameId?: ApiCatalogGame | string | null;
  gameName?: string;
  isGeneric?: boolean;
  scoringFields?: ScoringFieldKey[];
  description?: string;
  killPoints: number;
  winPoints?: number;
  drawPoints?: number;
  lossPoints?: number;
  isTemplate?: boolean;
  isPlatform?: boolean;
  placementPoints: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCatalogGame {
  _id: string;
  name: string;
  logo?: string | null;
  logoLight?: string | null;
  logoDark?: string | null;
  maps: string[];
  modes: string[];
  formats?: GameFormat[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiSupportRequest {
  _id: string;
  userId?: Pick<ApiUser, "_id" | "name" | "email"> | string | null;
  name: string;
  email: string;
  subject: "Account & billing" | "Events and teams" | "Technical issue" | "Suggestions" | "Other";
  message: string;
  status: "New" | "In review" | "Resolved";
  createdAt: string;
  updatedAt: string;
}

export interface ApiMatch {
  _id: string;
  eventId: string;
  name: string;
  map?: string;
  status: "Pending Results" | "Completed";
  order: number;
  createdAt: string;
  updatedAt: string;
  results?: ApiMatchResult[];
}

export interface ApiMatchResult {
  _id: string;
  matchId: string;
  teamId: string | ApiTeam;
  placement: number;
  kills: number;
  playerKills: Record<string, number>;
  totalPoints: number;
  isBanned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiLeaderboardRow {
  rank: number;
  team: ApiTeam;
  totalMatches: number;
  totalKills: number;
  positionPoints: number;
  killPoints: number;
  totalPoints: number;
  wwcd: number;
}

export interface ApiStandingsPointRow {
  rank: number;
  team: string;
  matchesPlayed: number;
  wins: number;
  position?: number;
  positionPoints: number;
  killPoints: number;
  totalPoints: number;
}

export interface ApiStandingsFraggerRow {
  rank: number;
  player: string;
  team: string;
  matchesPlayed: number;
  kills: number;
  averageKills: number;
}

export interface ApiAuditChange {
  field: string;
  label: string;
  type?: "changed" | "added" | "removed";
  message?: string;
  previousValue: unknown;
  newValue: unknown;
}

export interface ApiAuditLog {
  _id: string;
  eventId: string;
  userId: string;
  userName: string;
  category: "event" | "team" | "match" | "result" | "scoring" | "export";
  action: string;
  message: string;
  changes: ApiAuditChange[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type CreateAuditLogInput = {
  category: ApiAuditLog["category"];
  action: string;
  message: string;
  changes?: ApiAuditChange[];
  metadata?: Record<string, unknown>;
};

export type ApiUserLogCategory = "login" | "activity" | "account";

export interface ApiUserLogChange {
  field: string;
  label: string;
  type?: "changed" | "added" | "removed";
  message?: string;
  previousValue: unknown;
  newValue: unknown;
}

export interface ApiUserLog {
  _id: string;
  userId: string;
  userName: string;
  actorId?: string;
  actorName?: string;
  category: ApiUserLogCategory;
  action: string;
  message: string;
  changes: ApiUserLogChange[];
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  eventsCount: number;
  scoringRulesCount: number;
  teamsCount: number;
  recentEvents: ApiEvent[];
}

export interface ApiPage<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiScoringRulePage extends ApiPage<ApiScoringRule> {
  counts: { all: number; platform: number; custom: number };
}

// ---------- Teams API ----------

export const teamsApi = {
  getAll: (options?: { includeEventTeams?: boolean }) =>
    request<ApiTeam[]>(`/teams${options?.includeEventTeams ? "?includeEventTeams=true" : ""}`),
  getPage: (options: { page: number; limit?: number; search?: string; source?: "pool" | "event" }) => {
    const params = new URLSearchParams({ page: String(options.page) });
    if (options.limit) params.set("limit", String(options.limit));
    if (options.search?.trim()) params.set("search", options.search.trim());
    if (options.source) params.set("source", options.source);
    return request<ApiPage<ApiTeam>>(`/teams?${params.toString()}`);
  },
  getCachedPage: (options: { page: number; limit?: number; search?: string; source?: "pool" | "event" }) => {
    const params = new URLSearchParams({ page: String(options.page) });
    if (options.limit) params.set("limit", String(options.limit));
    if (options.search?.trim()) params.set("search", options.search.trim());
    if (options.source) params.set("source", options.source);
    return getCachedApiResponse<ApiPage<ApiTeam>>(`/teams?${params.toString()}`);
  },
  getPlayerSuggestions: (options?: { limit?: number }) =>
    request<string[]>(
      `/teams/players/suggestions${options?.limit ? `?limit=${options.limit}` : ""}`,
    ),
  getById: (id: string) => request<ApiTeam>(`/teams/${id}`),
  create: (data: {
    name: string;
    tags?: string[];
    contactMobile?: string;
    notes?: string;
    players?: ApiPlayer[];
    isPoolTeam?: boolean;
    source?: "pool" | "event";
    sourceEventId?: string | null;
    sourceEventName?: string;
  }) =>
    request<ApiTeam>("/teams", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  createBulk: (teams: Array<{
    name: string;
    tags?: string[];
    contactMobile?: string;
    notes?: string;
  }>) => request<ApiTeam[]>("/teams/bulk", {
    method: "POST",
    body: JSON.stringify({ teams }),
  }),
  createWithLogo: (data: {
    name: string;
    tags?: string[];
    contactMobile?: string;
    notes?: string;
    players?: ApiPlayer[];
    logoFile?: File | null;
    isPoolTeam?: boolean;
    source?: "pool" | "event";
    sourceEventId?: string | null;
    sourceEventName?: string;
  }) => {
    const form = new FormData();
    form.append("name", data.name);
    form.append("tags", JSON.stringify(data.tags ?? []));
    if (data.contactMobile !== undefined) form.append("contactMobile", data.contactMobile);
    if (data.notes !== undefined) form.append("notes", data.notes);
    form.append("players", JSON.stringify(data.players ?? []));
    if (data.isPoolTeam !== undefined) form.append("isPoolTeam", String(data.isPoolTeam));
    if (data.source) form.append("source", data.source);
    if (data.sourceEventId) form.append("sourceEventId", data.sourceEventId);
    if (data.sourceEventName) form.append("sourceEventName", data.sourceEventName);
    if (data.logoFile) form.append("logo", data.logoFile);
    return request<ApiTeam>("/teams", { method: "POST", body: form });
  },
  update: (
    id: string,
    data: Partial<{
      name: string;
      tags: string[];
      contactMobile: string;
      notes: string;
      players: ApiPlayer[];
      isPoolTeam: boolean;
      source: "pool" | "event";
      sourceEventId: string | null;
      sourceEventName: string;
    }> & {
      logoFile?: File | null;
      removeLogo?: boolean;
    },
  ) => {
    if (data.logoFile) {
      const form = new FormData();
      if (data.name) form.append("name", data.name);
      if (data.tags) form.append("tags", JSON.stringify(data.tags));
      if (data.contactMobile !== undefined) form.append("contactMobile", data.contactMobile);
      if (data.notes !== undefined) form.append("notes", data.notes);
      if (data.players) form.append("players", JSON.stringify(data.players));
      if (data.isPoolTeam !== undefined) form.append("isPoolTeam", String(data.isPoolTeam));
      if (data.source) form.append("source", data.source);
      if (data.sourceEventId !== undefined && data.sourceEventId)
        form.append("sourceEventId", data.sourceEventId);
      if (data.sourceEventName !== undefined) form.append("sourceEventName", data.sourceEventName);
      form.append("logo", data.logoFile);
      if (data.removeLogo) form.append("removeLogo", "true");
      return request<ApiTeam>(`/teams/${id}`, { method: "PUT", body: form });
    }
    return request<ApiTeam>(`/teams/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  delete: (id: string) =>
    request<{ message: string; removedFromPoolOnly?: boolean }>(`/teams/${id}`, {
      method: "DELETE",
    }),
  getStats: (id: string) =>
    request<{
      teamId: string;
      matchesPlayed: number;
      lastEvent: { eventId: string | null; eventName: string } | null;
      topFraggers: Array<{ playerId: string; name: string; kills: number }>;
    }>(`/teams/${id}/stats`),
};

// ---------- Events API ----------

export const eventsApi = {
  getAll: () => request<ApiEvent[]>("/events"),
  getPage: (options: { page: number; limit?: number; search?: string }) => {
    const params = new URLSearchParams({ page: String(options.page) });
    if (options.limit) params.set("limit", String(options.limit));
    if (options.search?.trim()) params.set("search", options.search.trim());
    return request<ApiPage<ApiEvent>>(`/events?${params.toString()}`);
  },
  getCachedPage: (options: { page: number; limit?: number; search?: string }) => {
    const params = new URLSearchParams({ page: String(options.page) });
    if (options.limit) params.set("limit", String(options.limit));
    if (options.search?.trim()) params.set("search", options.search.trim());
    return getCachedApiResponse<ApiPage<ApiEvent>>(`/events?${params.toString()}`);
  },
  getCachedById: (id: string) => getCachedApiResponse<ApiEvent>(`/events/${id}`),
  getById: (id: string) => request<ApiEvent>(`/events/${id}`),
  create: (data: {
    name: string;
    gameId?: string | null;
    game: string;
    format: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    scoringRuleId?: string;
    teams?: string[];
  }) =>
    request<ApiEvent>("/events", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  createWithSetup: (data: {
    event: {
      name: string;
      gameId?: string | null;
      game: string;
      format: string;
      startDate?: string;
      endDate?: string;
      status?: string;
    };
    scoringRule: {
      name: string;
      format: string;
      gameId?: string | null;
      gameName?: string;
      isGeneric?: boolean;
      scoringFields?: ScoringFieldKey[];
      description?: string;
      killPoints: number;
      winPoints?: number;
      drawPoints?: number;
      lossPoints?: number;
      isTemplate?: boolean;
      placementPoints: Record<string, number>;
    };
    teams?: Array<{
      id?: string;
      name?: string;
      logo?: string | null;
      tags?: string[];
      contactMobile?: string;
      addToDatabase?: boolean;
      players?: string[];
    }>;
  }) =>
    request<ApiEvent>("/events/setup", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (
    id: string,
    data: Partial<{
      name: string;
      gameId: string | null;
      game: string;
      format: string;
      startDate: string;
      endDate: string;
      status: string;
      scoringRuleId: string;
      teams: string[];
    }>,
  ) =>
    request<ApiEvent>(`/events/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) => request<{ message: string }>(`/events/${id}`, { method: "DELETE" }),
  getDashboardStats: () => request<DashboardStats>("/dashboard/summary"),
  getCachedDashboardStats: () => getCachedApiResponse<DashboardStats>("/dashboard/summary"),
};

// ---------- Matches API ----------

export const matchesApi = {
  getByEvent: (eventId: string) => request<ApiMatch[]>(`/matches/event/${eventId}`),
  getCachedByEvent: (eventId: string) => getCachedApiResponse<ApiMatch[]>(`/matches/event/${eventId}`),
  create: (data: { eventId: string; name: string; map?: string; order?: number }) =>
    request<ApiMatch>("/matches", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<ApiMatch>) =>
    request<ApiMatch>(`/matches/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) => request<{ message: string }>(`/matches/${id}`, { method: "DELETE" }),
  getResults: (matchId: string) => request<ApiMatchResult[]>(`/matches/${matchId}/results`),
  saveResults: (
    matchId: string,
    results: Array<{
      teamId: string;
      placement: number;
      kills: number;
      playerKills?: Record<string, number>;
      isBanned?: boolean;
    }>,
  ) =>
    request<ApiMatchResult[]>(`/matches/${matchId}/results`, {
      method: "POST",
      body: JSON.stringify({ results }),
    }),
  getLeaderboard: (eventId: string) =>
    request<ApiLeaderboardRow[]>(`/matches/event/${eventId}/leaderboard`),
  getCachedLeaderboard: (eventId: string) =>
    getCachedApiResponse<ApiLeaderboardRow[]>(`/matches/event/${eventId}/leaderboard`),
  getStandings: (
    eventId: string,
    options: {
      view: "single-match" | "till-match";
      type: "points" | "fraggers";
      matchNumber: number;
    },
  ) =>
    request<Array<ApiStandingsPointRow | ApiStandingsFraggerRow>>(
      `/matches/event/${eventId}/standings?view=${encodeURIComponent(options.view)}&type=${encodeURIComponent(options.type)}&matchNumber=${options.matchNumber}`,
    ),
};

// ---------- Audit Logs API ----------

export const auditLogsApi = {
  getByEvent: (eventId: string) => request<ApiAuditLog[]>(`/audit-logs/event/${eventId}`),
  create: (eventId: string, data: CreateAuditLogInput) =>
    request<ApiAuditLog>(`/audit-logs/event/${eventId}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ---------- Support API ----------

export const supportApi = {
  create: (data: Pick<ApiSupportRequest, "name" | "email" | "subject" | "message">) =>
    request<ApiSupportRequest>("/support", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ---------- Scoring Rules API ----------

export const scoringRulesApi = {
  getAll: () => request<ApiScoringRule[]>("/scoring-rules"),
  getPage: (options: { page: number; limit?: number; search?: string; type?: "all" | "platform" | "custom" }) => {
    const params = new URLSearchParams({ page: String(options.page) });
    if (options.limit) params.set("limit", String(options.limit));
    if (options.search?.trim()) params.set("search", options.search.trim());
    if (options.type && options.type !== "all") params.set("type", options.type);
    return request<ApiScoringRulePage>(`/scoring-rules?${params.toString()}`);
  },
  getCachedPage: (options: { page: number; limit?: number; search?: string; type?: "all" | "platform" | "custom" }) => {
    const params = new URLSearchParams({ page: String(options.page) });
    if (options.limit) params.set("limit", String(options.limit));
    if (options.search?.trim()) params.set("search", options.search.trim());
    if (options.type && options.type !== "all") params.set("type", options.type);
    return getCachedApiResponse<ApiScoringRulePage>(`/scoring-rules?${params.toString()}`);
  },
  getById: (id: string) => request<ApiScoringRule>(`/scoring-rules/${id}`),
  getUsage: (id: string) => request<{ eventCount: number }>(`/scoring-rules/${id}/usage`),
  create: (data: {
    name: string;
    format?: string;
    gameId?: string | null;
    gameName?: string;
    isGeneric?: boolean;
    scoringFields?: ScoringFieldKey[];
    description?: string;
    killPoints: number;
    winPoints?: number;
    drawPoints?: number;
    lossPoints?: number;
    isTemplate?: boolean;
    placementPoints: Record<string, number>;
  }) =>
    request<ApiScoringRule>("/scoring-rules", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (
    id: string,
    data: Partial<{
      name: string;
      format: string;
      gameId: string | null;
      gameName: string;
      isGeneric: boolean;
      scoringFields: ScoringFieldKey[];
      description: string;
      killPoints: number;
      winPoints: number;
      drawPoints: number;
      lossPoints: number;
      isTemplate: boolean;
      placementPoints: Record<string, number>;
    }>,
    options?: { applyToEvents?: boolean },
  ) =>
    request<ApiScoringRule>(`/scoring-rules/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        ...data,
        applyToEvents: options?.applyToEvents,
      }),
    }),
  delete: (id: string) =>
    request<{ message: string }>(`/scoring-rules/${id}`, { method: "DELETE" }),
};

// ---------- Admin API ----------

export interface ApiOrphanedAsset {
  publicId: string;
  url: string;
  format: string;
  bytes: number;
  createdAt: string;
  folder?: string;
}

export interface ApiPlatformTemplate {
  id: string;
  name: string;
  category: string;
  format: string;
  previewUrl: string;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

export const templatesApi = {
  getAll: () => request<ApiPlatformTemplate[]>("/templates"),
};

export const eventTeamsExportApi = {
  generate: async (
    eventId: string,
    format: "image" | "excel",
    onProgress: (progress: number, stage: string) => void,
  ): Promise<{ blob: Blob; filename: string }> => {
    const response = await fetch(
      `${API_BASE}/exports/events/${encodeURIComponent(eventId)}/teams-export?format=${format}`,
      { method: "POST", headers: authHeaders() },
    );
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error((body as { message?: string }).message || "Could not generate this export.");
    }
    if (!response.body) throw new Error("Export progress is unavailable in this browser.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = "";
    let result: { blob: Blob; filename: string } | null = null;
    const handleLine = (line: string) => {
      if (!line.trim()) return;
      const message = JSON.parse(line) as {
        type: "progress" | "complete" | "error";
        progress?: number;
        stage?: string;
        filename?: string;
        mimeType?: string;
        file?: string;
        message?: string;
      };
      if (message.type === "progress") {
        onProgress(message.progress || 0, message.stage || "Preparing export");
      } else if (message.type === "error") {
        throw new Error(message.message || "Could not generate this export.");
      } else if (message.type === "complete" && message.file) {
        const bytes = Uint8Array.from(atob(message.file), (char) => char.charCodeAt(0));
        result = {
          blob: new Blob([bytes], { type: message.mimeType || "application/octet-stream" }),
          filename: message.filename || "event-teams-export",
        };
        onProgress(100, "Download ready");
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      pending += decoder.decode(value || new Uint8Array(), { stream: !done });
      const lines = pending.split("\n");
      pending = lines.pop() || "";
      for (const line of lines) handleLine(line);
      if (done) break;
    }
    if (pending.trim()) handleLine(pending);
    if (!result) throw new Error("The export finished without a downloadable file.");
    return result;
  },
};

export const adminApi = {
  getUsers: () => request<ApiUser[]>("/admin/users"),
  getSupportRequests: () => request<ApiSupportRequest[]>("/admin/support-requests"),
  updateSupportRequest: (id: string, data: Pick<ApiSupportRequest, "status">) =>
    request<ApiSupportRequest>(`/admin/support-requests/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  getUserById: (id: string) => request<ApiUser>(`/admin/users/${id}`),
  deleteUser: (id: string) =>
    request<{ message: string }>(`/admin/users/${id}`, { method: "DELETE" }),
  getUserEvents: (id: string) => request<ApiEvent[]>(`/admin/users/${id}/events`),
  getUserTeams: (id: string) => request<ApiTeam[]>(`/admin/users/${id}/teams`),
  getUserScoringRules: (id: string) =>
    request<ApiScoringRule[]>(`/admin/users/${id}/scoring-rules`),
  getUserLogs: (id: string, type: ApiUserLogCategory) =>
    request<ApiUserLog[]>(`/admin/users/${id}/logs?type=${encodeURIComponent(type)}`),
  getOrphanedAssets: () => request<ApiOrphanedAsset[]>("/admin/orphaned-assets"),
  cleanupOrphanedAssets: (publicIds: string[]) =>
    request<{ message: string; result: unknown }>("/admin/orphaned-assets/cleanup", {
      method: "POST",
      body: JSON.stringify({ publicIds }),
    }),
  getGames: () => request<ApiCatalogGame[]>("/admin/games"),
  createGame: (data: {
    name: string;
    logo?: string | null;
    logoLight?: string | null;
    logoDark?: string | null;
    logoLightFile?: File | null;
    logoDarkFile?: File | null;
    maps: string[];
    modes: string[];
    formats?: GameFormat[];
  }) => {
    const hasFiles = Boolean(data.logoLightFile || data.logoDarkFile);
    if (hasFiles) {
      const form = new FormData();
      form.append("name", data.name);
      form.append("logo", data.logo || "");
      form.append("logoLightUrl", data.logoLight || "");
      form.append("logoDarkUrl", data.logoDark || "");
      form.append("maps", JSON.stringify(data.maps));
      form.append("modes", JSON.stringify(data.modes));
      form.append("formats", JSON.stringify(data.formats || []));
      if (data.logoLightFile) form.append("logoLight", data.logoLightFile);
      if (data.logoDarkFile) form.append("logoDark", data.logoDarkFile);
      return request<ApiCatalogGame>("/admin/games", { method: "POST", body: form });
    }
    return request<ApiCatalogGame>("/admin/games", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  updateGame: (
    id: string,
    data: {
      name: string;
      logo?: string | null;
      logoLight?: string | null;
      logoDark?: string | null;
      logoLightFile?: File | null;
      logoDarkFile?: File | null;
      maps: string[];
      modes: string[];
      formats?: GameFormat[];
    },
  ) => {
    const hasFiles = Boolean(data.logoLightFile || data.logoDarkFile);
    if (hasFiles) {
      const form = new FormData();
      form.append("name", data.name);
      form.append("logo", data.logo || "");
      form.append("logoLightUrl", data.logoLight || "");
      form.append("logoDarkUrl", data.logoDark || "");
      form.append("maps", JSON.stringify(data.maps));
      form.append("modes", JSON.stringify(data.modes));
      form.append("formats", JSON.stringify(data.formats || []));
      if (data.logoLightFile) form.append("logoLight", data.logoLightFile);
      if (data.logoDarkFile) form.append("logoDark", data.logoDarkFile);
      return request<ApiCatalogGame>(`/admin/games/${id}`, { method: "PUT", body: form });
    }
    return request<ApiCatalogGame>(`/admin/games/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  deleteGame: (id: string) =>
    request<{ message: string }>(`/admin/games/${id}`, { method: "DELETE" }),
  getPlatformTemplates: () => request<ApiPlatformTemplate[]>("/admin/templates"),
  createPlatformTemplate: (data: Omit<ApiPlatformTemplate, "id" | "createdAt" | "updatedAt">) =>
    request<ApiPlatformTemplate>("/admin/templates", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updatePlatformTemplate: (id: string, data: Partial<Omit<ApiPlatformTemplate, "id" | "createdAt" | "updatedAt">>) =>
    request<ApiPlatformTemplate>(`/admin/templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deletePlatformTemplate: (id: string) =>
    request<{ message: string }>(`/admin/templates/${id}`, { method: "DELETE" }),
  getPlatformScoringRules: () => request<ApiScoringRule[]>("/admin/scoring-rules"),
  createPlatformScoringRule: (data: {
    name: string;
    format?: string;
    gameId?: string | null;
    gameName?: string;
    isGeneric?: boolean;
    scoringFields?: ScoringFieldKey[];
    description?: string;
    killPoints: number;
    winPoints?: number;
    drawPoints?: number;
    lossPoints?: number;
    placementPoints: Record<string, number>;
  }) =>
    request<ApiScoringRule>("/admin/scoring-rules", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updatePlatformScoringRule: (
    id: string,
    data: {
      name: string;
      format?: string;
      gameId?: string | null;
      gameName?: string;
      isGeneric?: boolean;
      scoringFields?: ScoringFieldKey[];
      description?: string;
      killPoints: number;
      winPoints?: number;
      drawPoints?: number;
      lossPoints?: number;
      placementPoints: Record<string, number>;
    },
  ) =>
    request<ApiScoringRule>(`/admin/scoring-rules/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deletePlatformScoringRule: (id: string) =>
    request<{ message: string }>(`/admin/scoring-rules/${id}`, { method: "DELETE" }),
};

export const catalogApi = {
  getGames: () => request<ApiCatalogGame[]>("/catalog/games"),
};
