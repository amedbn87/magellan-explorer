import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import type { GnssSnapshot } from "../data/types";
import { createGnssProvider, emptySnapshot } from "../services/gnss";
import { subscribeCompass } from "../services/compass/CompassService";

interface MagellanContextValue {
  gnss: GnssSnapshot;
  compassHeadingDeg: number | undefined;
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
    }),
    [gnss, compassHeadingDeg],
  );

  return <MagellanContext.Provider value={value}>{children}</MagellanContext.Provider>;
}

export function useMagellan(): MagellanContextValue {
  const ctx = useContext(MagellanContext);
  if (!ctx) throw new Error("useMagellan must be used within MagellanProvider");
  return ctx;
}
