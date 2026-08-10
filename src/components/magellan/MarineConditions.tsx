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
      setData(null);
      setError(null);
      return;
    }

    const previous = lastRequestRef.current;
    const moved = previous ? distanceMeters(previous.latitude, previous.longitude, latitude, longitude) : Infinity;
    const freshEnough = previous ? Date.now() - previous.at < REFRESH_MS : false;

    // GPS can update every second. Marine/weather data does not need that
    // frequency. Re-fetching two remote endpoints for every GPS callback can
    // create a fetch/abort/render storm in Android WebView and starve touch.
    if (previous && (freshEnough || moved < MIN_MOVE_M)) return;

    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      const controller = new AbortController();
      let active = true;
      setLoading(true);
      setError(null);
      lastRequestRef.current = { latitude, longitude, at: Date.now() };
      void fetchMarineConditions(latitude, longitude, controller.signal)
        .then((next) => { if (active) setData(next); })
        .catch((e: unknown) => {
          if (!active || controller.signal.aborted) return;
          // Keep the last successful values visible when a transient network
          // request fails; the error is informational rather than a blocking UI state.
          setError(e instanceof Error ? e.message : "Marine data unavailable");
        })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; controller.abort(); };
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [latitude, longitude]);

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Live marine conditions</h2>
          <p className="text-xs text-muted-foreground">Real forecast/model data for the selected coordinates.</p>
        </div>
        <Waves className="h-5 w-5 text-primary" aria-hidden />
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Loading marine conditions…</p> : null}
      {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      {!loading && !error && !data ? <p className="text-sm text-muted-foreground">Live GNSS coordinates are required.</p> : null}
      {data ? (
        <>
          <div className={compact ? "grid grid-cols-2 gap-2 sm:grid-cols-4" : "grid grid-cols-2 gap-3 sm:grid-cols-4"}>
            <Stat label="Wind" value={data.windSpeedKmh?.toFixed(1)} unit="km/h" hint={data.windDirectionDeg !== undefined ? `${data.windDirectionDeg.toFixed(0)}°` : undefined} />
            <Stat label="Wave height" value={data.waveHeightM?.toFixed(1)} unit="m" hint={data.wavePeriodS !== undefined ? `${data.wavePeriodS.toFixed(1)} s period` : undefined} />
            <Stat label="Sea temperature" value={data.seaTemperatureC?.toFixed(1)} unit="°C" />
            <Stat label="Pressure" value={data.pressureHpa?.toFixed(0)} unit="hPa" />
            <Stat label="Air temperature" value={data.airTemperatureC?.toFixed(1)} unit="°C" />
            <Stat label="Ocean current" value={data.currentSpeedKmh?.toFixed(1)} unit="km/h" hint={data.currentDirectionDeg !== undefined ? `${data.currentDirectionDeg.toFixed(0)}°` : undefined} />
            <Stat label="Fishing activity" value={data.fishingActivity} hint={data.fishingActivityReason} />
            <Stat label="Data time" value={new Date(data.observedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} />
          </div>
          <p className="mt-3 flex items-start gap-2 text-[11px] text-muted-foreground"><Fish className="mt-0.5 h-3.5 w-3.5 shrink-0" />{data.source}</p>
          {!compact ? <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Wind className="h-3.5 w-3.5" />Sunrise: {data.sunrise ? new Date(data.sunrise).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</span><span className="flex items-center gap-1"><CloudSun className="h-3.5 w-3.5" />Sunset: {data.sunset ? new Date(data.sunset).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</span><span className="flex items-center gap-1"><Gauge className="h-3.5 w-3.5" />Waves: real forecast/model value</span></div> : null}
        </>
      ) : null}
    </section>
  );
}
