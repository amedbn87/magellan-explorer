import * as Location from "expo-location";
import type { GnssSnapshot } from "../../data/types";
import type { GnssProvider } from "./GnssProvider";
import { emptySnapshot } from "./GnssProvider";

/**
 * Cross-platform fallback GNSS source built on expo-location.
 *
 * This gives real latitude/longitude/altitude/accuracy/speed/course on both
 * platforms, but expo-location does NOT expose raw GnssStatus data
 * (per-satellite SVID/azimuth/elevation/C-N0, constellation, used-in-fix).
 * That real data only exists on Android via the native `magellan-gnss`
 * Expo Module (see modules/magellan-gnss). This provider is the baseline
 * that always works; AndroidGnssStatusProvider (native module) supersedes
 * it on Android when available.
 */
export class ExpoLocationGnssProvider implements GnssProvider {
  readonly id: GnssSnapshot["source"] = "ExpoLocation";

  subscribe(onSnapshot: (snapshot: GnssSnapshot) => void): () => void {
    let cancelled = false;
    let sub: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || cancelled) return;

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 0,
        },
        (position) => {
          if (cancelled) return;
          const c = position.coords;
          const snapshot: GnssSnapshot = {
            isNative: true,
            source: this.id,
            timestamp: position.timestamp,
            latitude: c.latitude,
            longitude: c.longitude,
            altitudeM: c.altitude ?? undefined,
            accuracyM: c.accuracy ?? undefined,
            speedMps: c.speed !== null && c.speed >= 0 ? c.speed : undefined,
            courseBearingDeg: c.heading !== null && c.heading >= 0 ? c.heading : undefined,
            fixQuality: c.accuracy !== null && c.accuracy <= 50 ? "3D" : "2D",
            satellitesVisible: 0,
            satellitesUsedInFix: 0,
            satellites: [],
          };
          onSnapshot(snapshot);
        },
      );
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }
}

export function initialGnssSnapshot(): GnssSnapshot {
  return emptySnapshot("ExpoLocation");
}
