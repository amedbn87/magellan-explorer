import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { useMagellan } from "../src/state/MagellanProvider";
import { Screen, Title, Card, StatRow, colors } from "../src/ui/primitives";
import { fetchMarineConditions, type MarineConditions } from "../src/services/marine/MarineService";

const unavailable = (v: number | undefined, unit: string) => (v !== undefined ? `${v.toFixed(1)} ${unit}` : "Unavailable");

export default function MarineScreen() {
  const { gnss } = useMagellan();
  const [conditions, setConditions] = useState<MarineConditions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestFix = useRef<{ lat: number; lon: number } | null>(null);

  // Refs must only be written from effects/handlers, never during render.
  useEffect(() => {
    if (gnss.latitude !== undefined && gnss.longitude !== undefined) {
      latestFix.current = { lat: gnss.latitude, lon: gnss.longitude };
    }
  }, [gnss.latitude, gnss.longitude]);

  const load = useCallback((lat: number, lon: number, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    fetchMarineConditions(lat, lon, signal)
      .then(setConditions)
      .catch((e) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Failed to load marine data.");
      })
      .finally(() => setLoading(false));
  }, []);

  // Fetch once a GNSS fix first becomes available. Deliberately NOT
  // re-fetching on every subsequent position update (those arrive ~1/sec) —
  // that would hammer the Open-Meteo API for no benefit. Use the manual
  // refresh button for an up-to-date read at the current position.
  //
  // This is the standard "fetch on mount/dependency change" effect pattern;
  // the synchronous setLoading/setError calls at the top of `load` are
  // intentional (they flip the UI into a loading state before the network
  // call starts) and don't cause a render loop since the effect's own
  // dependencies don't change as a result.
   
  useEffect(() => {
    if (gnss.latitude === undefined || gnss.longitude === undefined) return;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount, see comment above
    load(gnss.latitude, gnss.longitude, controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gnss.latitude !== undefined, gnss.longitude !== undefined]);

  return (
    <Screen>
      <Title>Marine</Title>
      {gnss.latitude === undefined ? (
        <Text style={styles.hint}>Waiting for a GNSS fix to fetch conditions for your location…</Text>
      ) : loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : conditions ? (
        <Card>
          <StatRow label="Wind" value={`${unavailable(conditions.windSpeedKmh, "km/h")}${conditions.windDirectionDeg !== undefined ? ` @ ${conditions.windDirectionDeg.toFixed(0)}°` : ""}`} />
          <StatRow label="Wave height" value={unavailable(conditions.waveHeightM, "m")} />
          <StatRow label="Wave period" value={unavailable(conditions.wavePeriodS, "s")} />
          <StatRow label="Pressure" value={unavailable(conditions.pressureHpa, "hPa")} />
          <StatRow label="Air temp" value={unavailable(conditions.airTemperatureC, "°C")} />
          <StatRow label="Sea temp" value={unavailable(conditions.seaTemperatureC, "°C")} />
          <StatRow label="Current" value={unavailable(conditions.currentSpeedKmh, "km/h")} />
          <StatRow label="Sunrise" value={conditions.sunrise ? new Date(conditions.sunrise).toLocaleTimeString() : "Unavailable"} />
          <StatRow label="Sunset" value={conditions.sunset ? new Date(conditions.sunset).toLocaleTimeString() : "Unavailable"} />
          <StatRow label="Fishing activity" value={conditions.fishingActivity} />
          <Text style={styles.reason}>{conditions.fishingActivityReason}</Text>
          <Text style={styles.source}>{conditions.source}</Text>
        </Card>
      ) : null}
      {gnss.latitude !== undefined && !loading ? (
        <Pressable
          style={styles.refresh}
          onPress={() => {
            if (latestFix.current) load(latestFix.current.lat, latestFix.current.lon);
          }}
        >
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.subtext },
  error: { color: colors.danger },
  reason: { color: colors.subtext, fontSize: 12, marginTop: 10 },
  source: { color: colors.subtext, fontSize: 11, marginTop: 6, fontStyle: "italic" },
  refresh: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  refreshText: { color: colors.accent, fontWeight: "600" },
});
