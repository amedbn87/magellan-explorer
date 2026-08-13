import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import type { GnssSnapshot } from "../data/types";
import { createGnssProvider, emptySnapshot } from "../services/gnss";
import { subscribeCompass } from "../services/compass/CompassService";
import { PreferencesRepository, type Preferences } from "../data/storage";
import { useNetworkStatus } from "../services/network/NetworkStatus";

const DEFAULT_PREFERENCES: Preferences = { distanceUnit: "metric", coordinateFormat: "decimal" };

interface MagellanContextValue {
  gnss: GnssSnapshot;
  compassHeadingDeg: number | undefined;
  network: { online: boolean | null; type: string };
  preferences: Preferences;
  setPreferences: (patch: Partial<Preferences>) => void;
  activeWaypointId: string | null;
  setActiveWaypointId: (id: string | null) => void;
}

const MagellanContext = createContext<MagellanContextValue | null>(null);

export function MagellanProvider({ children }: { children: React.ReactNode }) {
  // Lazy useState initializer instead of a ref: the provider instance must
  // only be constructed once, but reading `ref.current` during render is a
  // React purity violation (refs are for effects/handlers, not render).
  // useState's initializer runs exactly once and its result is a stable,
  // render-safe value.
  const [provider] = useState(() => createGnssProvider());
  const [gnss, setGnss] = useState<GnssSnapshot>(() => emptySnapshot(provider.id));
  const [compassHeadingDeg, setCompassHeadingDeg] = useState<number | undefined>(undefined);
  const [preferences, setPreferencesState] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [activeWaypointId, setActiveWaypointId] = useState<string | null>(null);
  const network = useNetworkStatus();

  useEffect(() => {
    PreferencesRepository.get().then(setPreferencesState);
  }, []);

  const setPreferences = useCallback((patch: Partial<Preferences>) => {
    // Optimistic local update, persisted in the background — the settings
    // screen shouldn't wait on a SQLite round-trip to feel responsive.
    setPreferencesState((prev) => ({ ...prev, ...patch }));
    PreferencesRepository.set(patch);
  }, []);

  useEffect(() => {
    // React Native components do NOT unmount when the app is backgrounded —
    // only native onPause/onStop fire. Without gating on AppState, the GNSS
    // status callback (native Kotlin thread) and the magnetometer listener
    // would both keep running indefinitely while the app is backgrounded,
    // draining battery and holding the GPS chip active for no visible UI.
    // See MASTER PROMPT section 18/19/20.
    let unsubscribeGnss: (() => void) | null = null;
    let unsubscribeCompass: (() => void) | null = null;

    const start = () => {
      if (unsubscribeGnss || unsubscribeCompass) return;
      unsubscribeGnss = provider.subscribe(setGnss);
      unsubscribeCompass = subscribeCompass(setCompassHeadingDeg);
    };

    const stop = () => {
      unsubscribeGnss?.();
      unsubscribeCompass?.();
      unsubscribeGnss = null;
      unsubscribeCompass = null;
    };

    if (AppState.currentState === "active") start();

    const onAppStateChange = (state: AppStateStatus) => {
      if (state === "active") start();
      else stop();
    };
    const subscription = AppState.addEventListener("change", onAppStateChange);

    return () => {
      subscription.remove();
      stop();
    };
  }, [provider]);

  const value = useMemo(
    () => ({
      gnss: { ...gnss, compassHeadingDeg },
      compassHeadingDeg,
      network,
      preferences,
      setPreferences,
      activeWaypointId,
      setActiveWaypointId,
    }),
    [gnss, compassHeadingDeg, network, preferences, setPreferences, activeWaypointId],
  );

  return <MagellanContext.Provider value={value}>{children}</MagellanContext.Provider>;
}

export function useMagellan(): MagellanContextValue {
  const ctx = useContext(MagellanContext);
  if (!ctx) throw new Error("useMagellan must be used within MagellanProvider");
  return ctx;
}
