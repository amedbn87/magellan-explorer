import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DemoGnssProvider } from "./demo-gnss";
import { demoSnapshot } from "./demo-gnss";
import type { GnssSnapshot, HistoryEntry, Waypoint, WaypointGroup } from "./types";
import {
  loadGroups,
  loadHistory,
  loadWaypoints,
  saveGroups,
  saveHistory,
  saveWaypoints,
  SEED_GROUPS,
  SEED_WAYPOINTS,
  uid,
} from "./storage";
import { translate, type Lang, type TKey } from "./i18n";

export type HeadingSource = "course" | "compass";

interface MagellanState {
  snapshot: GnssSnapshot;
  heading: number | undefined;
  headingSource: HeadingSource | "unavailable";
  waypoints: Waypoint[];
  groups: WaypointGroup[];
  addWaypoint: (w: Omit<Waypoint, "id" | "createdAt">) => Waypoint;
  updateWaypoint: (id: string, patch: Partial<Waypoint>) => void;
  deleteWaypoint: (id: string) => void;
  addGroup: (name: string) => WaypointGroup | null;
  updateGroup: (id: string, name: string) => void;
  deleteGroup: (id: string) => void;
  activeWaypointId: string | null;
  setActiveWaypointId: (id: string | null) => void;
  history: HistoryEntry[];
  addHistory: (e: Omit<HistoryEntry, "id" | "at">) => void;
  clearHistory: () => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
  t: (k: TKey) => string;
}

const Ctx = createContext<MagellanState | null>(null);

function normalizeHeading(value: number): number {
  return ((value % 360) + 360) % 360;
}

function orientationHeading(event: DeviceOrientationEvent): number | undefined {
  const alpha = event.alpha;
  if (alpha === null) return undefined;
  const webkit = event as DeviceOrientationEvent & { webkitCompassHeading?: number };
  if (typeof webkit.webkitCompassHeading === "number" && Number.isFinite(webkit.webkitCompassHeading)) {
    return normalizeHeading(webkit.webkitCompassHeading);
  }
  return normalizeHeading(360 - alpha);
}

export function MagellanProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<GnssSnapshot>(() => demoSnapshot(0));
  const [waypoints, setWaypoints] = useState<Waypoint[]>(SEED_WAYPOINTS);
  const [groups, setGroups] = useState<WaypointGroup[]>(SEED_GROUPS);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeWaypointId, setActiveWaypointId] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("en");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [sensorHeading, setSensorHeading] = useState<number | undefined>(undefined);

  useEffect(() => {
    const loadedWaypoints = loadWaypoints();
    const loadedGroups = loadGroups();
    setWaypoints(loadedWaypoints);
    setGroups(loadedGroups);
    setHistory(loadHistory());
    const l = window.localStorage.getItem("magellan.lang");
    if (l === "ar" || l === "en") setLang(l);
    const th = window.localStorage.getItem("magellan.theme");
    if (th === "light" || th === "dark") setTheme(th);
  }, []);

  useEffect(() => {
    const provider = new DemoGnssProvider(1000);
    return provider.subscribe((next) => {
      setSnapshot((current) => ({
        ...next,
        compassHeadingDeg: sensorHeading ?? next.compassHeadingDeg,
      }));
    });
  }, [sensorHeading]);

  useEffect(() => {
    let active = true;
    const handler = (event: DeviceOrientationEvent) => {
      if (!active) return;
      const heading = orientationHeading(event);
      if (heading !== undefined) setSensorHeading(heading);
    };

    const eventName = "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation";
    window.addEventListener(eventName, handler as EventListener, { passive: true });
    return () => {
      active = false;
      window.removeEventListener(eventName, handler as EventListener);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.lang = lang;
    root.dir = lang === "ar" ? "rtl" : "ltr";
    window.localStorage.setItem("magellan.theme", theme);
    window.localStorage.setItem("magellan.lang", lang);
  }, [theme, lang]);

  const persistWaypoints = useCallback((next: Waypoint[]) => {
    setWaypoints(next);
    saveWaypoints(next);
  }, []);

  const persistGroups = useCallback((next: WaypointGroup[]) => {
    setGroups(next);
    saveGroups(next);
  }, []);

  const value = useMemo<MagellanState>(() => {
    const moving = (snapshot.speedMps ?? 0) > 0.7;
    const heading = moving ? snapshot.courseBearingDeg : snapshot.compassHeadingDeg;
    const headingSource: MagellanState["headingSource"] =
      heading === undefined ? "unavailable" : moving ? "course" : "compass";

    return {
      snapshot,
      heading,
      headingSource,
      waypoints,
      groups,
      addWaypoint: (w) => {
        const wp: Waypoint = { ...w, id: uid(), createdAt: Date.now() };
        persistWaypoints([wp, ...waypoints]);
        return wp;
      },
      updateWaypoint: (id, patch) =>
        persistWaypoints(waypoints.map((w) => (w.id === id ? { ...w, ...patch } : w))),
      deleteWaypoint: (id) => persistWaypoints(waypoints.filter((w) => w.id !== id)),
      addGroup: (name) => {
        const trimmed = name.trim();
        if (!trimmed || groups.some((g) => g.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase())) return null;
        const group = { id: uid(), name: trimmed, createdAt: Date.now() };
        persistGroups([group, ...groups]);
        return group;
      },
      updateGroup: (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        persistGroups(groups.map((g) => (g.id === id ? { ...g, name: trimmed } : g)));
      },
      deleteGroup: (id) => {
        persistGroups(groups.filter((g) => g.id !== id));
        persistWaypoints(waypoints.map((w) => (w.groupId === id ? { ...w, groupId: undefined } : w)));
      },
      activeWaypointId,
      setActiveWaypointId,
      history,
      addHistory: (e) => {
        const next = [{ ...e, id: uid(), at: Date.now() }, ...history].slice(0, 60);
        setHistory(next);
        saveHistory(next);
      },
      clearHistory: () => {
        setHistory([]);
        saveHistory([]);
      },
      lang,
      setLang,
      theme,
      setTheme,
      t: (k) => translate(lang, k),
    };
  }, [snapshot, waypoints, groups, history, activeWaypointId, lang, theme, persistWaypoints, persistGroups]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMagellan(): MagellanState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMagellan must be used inside MagellanProvider");
  return ctx;
}
