import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "esportific-sidebar-collapsed";

function readCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeCollapsed(collapsed: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(collapsed));
  } catch {
    /* ignore quota / private mode */
  }
}

// Keep a synchronized global registry of listeners and the current collapse state
const listeners = new Set<(collapsed: boolean) => void>();
let globalCollapsed = readCollapsed();

function setGlobalCollapsed(next: boolean) {
  globalCollapsed = next;
  writeCollapsed(next);
  listeners.forEach((listener) => listener(next));
}

// Bind keydown globally EXACTLY ONCE at the module level to avoid duplicate toggles
if (typeof window !== "undefined") {
  window.addEventListener("keydown", (event: KeyboardEvent) => {
    if (!event.altKey || event.key.toLowerCase() !== "s") return;
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT")
    ) {
      return;
    }
    event.preventDefault();
    setGlobalCollapsed(!globalCollapsed);
  });
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(globalCollapsed);

  // Sync state between all hook instances (e.g. AppSidebar and SidebarBrand)
  useEffect(() => {
    listeners.add(setCollapsed);
    setCollapsed(globalCollapsed); // Set initial state correctly
    return () => {
      listeners.delete(setCollapsed);
    };
  }, []);

  const setCollapsedPersisted = useCallback((next: boolean) => {
    setGlobalCollapsed(next);
  }, []);

  const toggle = useCallback(() => {
    setGlobalCollapsed(!globalCollapsed);
  }, []);

  return { collapsed, toggle, setCollapsed: setCollapsedPersisted };
}
