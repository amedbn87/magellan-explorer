import { useEffect, useRef, useState } from "react";
import { CloudSun, Fish, Gauge, Waves, Wind } from "lucide-react";
import { fetchMarineConditions, type MarineConditions } from "@/lib/magellan/marine";
import { Stat } from "@/components/magellan/primitives";
import { distanceMeters } from "@/lib/magellan/geo";

const REFRESH_MS = 5 * 60 * 1000;
const MIN_MOVE_M = 250;
const DEBOUNCE_MS = 900;

export function MarineConditions({ latitude, longitude, compact = false }: { latitude?: number; longitude?: number; compact?: boolean }) {
  const [data, setData] = useState<MarineConditions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const lastRequestRef = useRef<{ latitude: number; longitude: number; at: number } | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (latitude === undefined || longitude === undefined) {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      return;
    }
    const previous = lastRequestRef.current;
    const moved = previous ? distanceMeters(previous.latitude, previous.longitude, latitude, longitude) : Infinity;
    const freshEnough = previous ? Date.now() - previous.at < REFRESH_MS : false;
    if (previous && (freshEnough || moved < MIN_MOVE_M)) return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      lastRequestRef.current = { latitude, longitude, at: Date.now() };
      const controller = new AbortController();
      setLoading(true);
      setError(null);
      void fetchMarineConditions(latitude, longitude, controller.signal)
        .then((next) => setData(next))
        .catch((e: unknown) => {
          if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Marine data unavailable");
        })
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [latitude, longitude]);

  if (latitude === undefined || longitude === undefined) return <section className="rounded-lg border border-border bg-card p-4"><p className="text-sm text-muted-foreground">Marine conditions unavailable until a valid position is available.</p></section>;
  return <section className="rounded-lg border border-border bg-card p-4"><div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="font-semibold">Marine conditions</h2><p className="text-xs text-muted-foreground">Open-source environmental data for the selected coordinates.</p></div><Waves className="h-5 w-5 text-primary" /></div>{loading && !data ? <p className="text-sm text-muted-foreground">Loading marine conditions…</p> : null}{error && !data ? <p className="text-sm text-muted-foreground">Marine data temporarily unavailable.</p> : null}{data ? <div className={compact ? "grid grid-cols-2 gap-2" : "grid grid-cols-2 gap-3 sm:grid-cols-4"}><Stat label="Wind" value={data.windSpeedMps !== undefined ? data.windSpeedMps.toFixed(1) : undefined} unit="m/s" hint={data.windDirectionDeg !== undefined ? `${data.windDirectionDeg.toFixed(0)}°` : undefined} /><Stat label="Wave" value={data.waveHeightM !== undefined ? data.waveHeightM.toFixed(1) : undefined} unit="m" /><Stat label="Pressure" value={data.pressureHpa !== undefined ? data.pressureHpa.toFixed(0) : undefined} unit="hPa" /><Stat label="Sea temperature" value={data.seaTemperatureC !== undefined ? data.seaTemperatureC.toFixed(1) : undefined} unit="°C" /><Stat label="Fishing activity" value={data.fishingActivityLabel} hint="Derived from available environmental conditions; not a direct fish detector." /><div className="flex items-center gap-2 text-xs text-muted-foreground"><Wind className="h-4 w-4" />Wind</div><div className="flex items-center gap-2 text-xs text-muted-foreground"><Gauge className="h-4 w-4" />Pressure</div><div className="flex items-center gap-2 text-xs text-muted-foreground"><CloudSun className="h-4 w-4" />Sea temperature</div><div className="flex items-center gap-2 text-xs text-muted-foreground"><Fish className="h-4 w-4" />Fishing index</div></div> : null}</section>;
}
