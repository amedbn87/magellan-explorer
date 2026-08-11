import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { GnssSnapshot } from "../data/types";
import { createGnssProvider, emptySnapshot } from "../services/gnss";
import { subscribeCompass } from "../services/compass/CompassService";

interface MagellanContextValue {
  gnss: GnssSnapshot;
  compassHeadingDeg: number | undefined;
}

const MagellanContext = createContext<MagellanContextValue | null>(null);

export function MagellanProvider({ children }: { children: React.ReactNode }) {
  const providerRef = useRef(createGnssProvider());
  const [gnss, setGnss] = useState<GnssSnapshot>(emptySnapshot(providerRef.current.id));
  const [compassHeadingDeg, setCompassHeadingDeg] = useState<number | undefined>(undefined);

  useEffect(() => {
    const unsubscribeGnss = providerRef.current.subscribe(setGnss);
    const unsubscribeCompass = subscribeCompass(setCompassHeadingDeg);
    return () => {
      unsubscribeGnss();
      unsubscribeCompass();
    };
  }, []);

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
