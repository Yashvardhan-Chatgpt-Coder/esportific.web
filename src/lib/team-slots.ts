function parseSlot(value: string) {
  const slot = Number.parseInt(value, 10);
  return Number.isFinite(slot) && slot > 0 ? slot : null;
}

function formatSlot(slot: number, padLength: number) {
  return padLength > 0 ? String(slot).padStart(padLength, "0") : String(slot);
}

export function normalizeSlottedTeams<T extends Record<K, string>, K extends keyof T & string>(
  teams: T[],
  slotKey: K,
  padLength = 0,
) {
  const usedSlots = new Set<number>();

  const normalized = teams.map((team) => {
    const requestedSlot = parseSlot(team[slotKey]);
    let assignedSlot = requestedSlot;

    if (!assignedSlot || usedSlots.has(assignedSlot)) {
      assignedSlot = 1;
      while (usedSlots.has(assignedSlot)) {
        assignedSlot++;
      }
    }

    usedSlots.add(assignedSlot);

    return {
      ...team,
      [slotKey]: formatSlot(assignedSlot, padLength),
    };
  });

  return normalized.sort((a, b) => {
    const slotA = parseSlot(a[slotKey]) ?? Number.MAX_SAFE_INTEGER;
    const slotB = parseSlot(b[slotKey]) ?? Number.MAX_SAFE_INTEGER;
    return slotA - slotB;
  });
}
