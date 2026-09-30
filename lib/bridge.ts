export interface BridgeEventLike {
  id?: string;
  title?: string;
  category?: string | null;
  bridge_name?: string | null;
  bridge_id?: string | null;
}

export interface BridgeModuleGroup {
  id: string;
  name: string;
  events: BridgeEventLike[];
}

export interface BridgeHierarchyGroup {
  id: string;
  label: string;
  modules: BridgeModuleGroup[];
}

export interface BridgeRecordLike {
  id: string;
  title: string;
  is_active?: boolean;
}

export function normalizeBridgeName(value?: string | null): string {
  const raw = (value ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return "";

  if (/^Bridge\s*[:#-]/i.test(raw)) {
    return raw.replace(/^Bridge\s*[:#-]?\s*/i, "").trim();
  }

  return raw;
}

export function classifyBridgeEvent(event: BridgeEventLike): string {
  const explicit = normalizeBridgeName(event.bridge_name);
  if (explicit) return explicit;

  const category = (event.category ?? "").trim().toLowerCase();
  if (category === "bridge") {
    const fromTitle = normalizeBridgeName(event.title);
    if (fromTitle) return fromTitle;
  }

  if (/^bridge\s*[:#-]/i.test(event.category ?? "")) {
    return normalizeBridgeName(event.category);
  }

  if (event.title && /^bridge\b/i.test(event.title)) {
    return normalizeBridgeName(event.title);
  }

  return "";
}

export function getEventsForBridge<T extends BridgeEventLike>(
  events: T[],
  bridge: BridgeRecordLike,
  bridges: BridgeRecordLike[]
): T[] {
  return events.filter((event) => getBridgeForEvent(event, bridges)?.id === bridge.id);
}

export function getBridgeForEvent(
  event: BridgeEventLike,
  bridges: BridgeRecordLike[]
): BridgeRecordLike | null {
  const exactMatch = bridges.find((bridge) => bridge.id === event.bridge_id);
  if (exactMatch) return exactMatch;

  const eventBridgeId = (event.bridge_id ?? "").trim();
  if (bridges.some((bridge) => bridge.id === eventBridgeId)) return null;

  const bridgeTitle = (event.bridge_name ?? "").trim().toLowerCase();
  if (!bridgeTitle) return null;
  return bridges.find((bridge) => bridge.title.trim().toLowerCase() === bridgeTitle) ?? null;
}

export function getMainEvents<T extends BridgeEventLike>(
  events: T[],
  bridges: BridgeRecordLike[]
): T[] {
  return events.filter(
    (event) => !getBridgeForEvent(event, bridges) && !classifyBridgeEvent(event)
  );
}

export function getBridgeGroups(events: BridgeEventLike[]) {
  const groups = new Map<string, { id: string; label: string; events: BridgeEventLike[] }>();

  for (const event of events) {
    const label = classifyBridgeEvent(event);
    if (!label) continue;

    const key = (event.bridge_id ?? label).trim() || label;
    if (!groups.has(key)) {
      groups.set(key, { id: key, label, events: [] });
    }

    groups.get(key)!.events.push(event);
  }

  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function getBridgeHierarchy(events: BridgeEventLike[]): BridgeHierarchyGroup[] {
  const groups = new Map<string, { id: string; label: string; modules: Map<string, BridgeModuleGroup> }>();

  for (const event of events) {
    const label = classifyBridgeEvent(event);
    if (!label) continue;

    const normalizedCategory = String(event.category ?? "").trim().toLowerCase();
    const isBridgeContainer =
      normalizedCategory === "bridge" ||
      (!!event.title && /^bridge\b/i.test(String(event.title)) && !!event.bridge_name) ||
      (!!event.title && /^bridge\b/i.test(String(event.title)) && !event.bridge_name);

    if (isBridgeContainer) continue;

    const key = (event.bridge_id ?? label).trim() || label;
    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        label,
        modules: new Map<string, BridgeModuleGroup>(),
      });
    }

    const bucket = groups.get(key)!;
    const moduleName = (event.category ?? "").trim() || "General";
    const moduleKey = moduleName.toLowerCase();
    if (!bucket.modules.has(moduleKey)) {
      bucket.modules.set(moduleKey, {
        id: moduleKey,
        name: moduleName,
        events: [],
      });
    }

    bucket.modules.get(moduleKey)!.events.push(event);
  }

  return [...groups.values()]
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((group) => ({
      id: group.id,
      label: group.label,
      modules: [...group.modules.values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((module) => ({
          ...module,
          events: [...module.events].sort((a, b) =>
            String(a.title ?? "").localeCompare(String(b.title ?? ""))
          ),
        })),
    }));
}
