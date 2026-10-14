import { useCallback, useEffect, useState } from "react";
import {
  authApi,
  getStoredUser,
  getUserInitials,
  persistUser,
  type ApiUser,
} from "@/lib/api";

export function useCurrentUser(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const [user, setUser] = useState<ApiUser | null>(() => getStoredUser());
  const [loading, setLoading] = useState(enabled);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const profile = await authApi.getProfile();
      persistUser(profile);
      setUser(profile);
    } catch {
      const cached = getStoredUser();
      setUser(cached);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) return;
    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<ApiUser>).detail;
      if (detail) setUser(detail);
      else setUser(getStoredUser());
    };
    window.addEventListener("esports:user-updated", onUpdated);
    return () => window.removeEventListener("esports:user-updated", onUpdated);
  }, [enabled]);

  const displayName = user?.name?.trim() || "Organizer";
  const initials = getUserInitials(displayName);
  const avatarUrl = user?.avatar?.trim() || null;

  return {
    user,
    loading,
    displayName,
    initials,
    avatarUrl,
    refresh,
  };
}
