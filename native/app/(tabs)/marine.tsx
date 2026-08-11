import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { useMagellan } from "../../src/state/MagellanProvider";
import { Screen, Title, Card, StatRow, colors } from "../../src/ui/primitives";
import { fetchMarineConditions, type MarineConditions } from "../../src/services/marine/MarineService";

const unavailable = (v: number | undefined, unit: string) => (v !== undefined ? `${v.toFixed(1)} ${unit}` : "Unavailable");

export default function MarineScreen() {
  const { gnss } = useMagellan();
  const [conditions, setConditions] = useState<MarineConditions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (gnss.latitude === undefined || gnss.longitude === undefined) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchMarineConditions(gnss.latitude, gnss.longitude, controller.signal)
      .then(setConditions)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load marine data."))
      .finally(() => setLoading(false));
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.subtext },
  error: { color: colors.danger },
  reason: { color: colors.subtext, fontSize: 12, marginTop: 10 },
  source: { color: colors.subtext, fontSize: 11, marginTop: 6, fontStyle: "italic" },
});
