import { Platform } from "react-native";
import type { GnssSnapshot } from "../../data/types";
import type { GnssProvider } from "./GnssProvider";
import { ExpoLocationGnssProvider } from "./ExpoLocationGnssProvider";
import {
  addGnssStatusListener,
  isMagellanGnssAvailable,
  startGnssUpdates,
  stopGnssUpdates,
} from "../../../modules/magellan-gnss";

/**
 * Merges real position (lat/lon/alt/accuracy/speed/course from
 * ExpoLocationGnssProvider) with real per-satellite data (from the native
 * MagellanGnss Android module). Falls back cleanly to position-only data if
 * the native module isn't linked (e.g. running inside Expo Go).
 */
export class AndroidGnssStatusProvider implements GnssProvider {
  readonly id: GnssSnapshot["source"] = "AndroidGnssStatus";
  private position = new ExpoLocationGnssProvider();

  static isSupported(): boolean {
    return Platform.OS === "android" && isMagellanGnssAvailable();
  }

  subscribe(onSnapshot: (snapshot: GnssSnapshot) => void): () => void {
    let latest: GnssSnapshot | null = null;

    const emit = () => {
      if (latest) onSnapshot(latest);
    };

    const stopPosition = this.position.subscribe((positionSnapshot) => {
      latest = { ...positionSnapshot, ...latest, source: this.id, isNative: true,
        latitude: positionSnapshot.latitude,
        longitude: positionSnapshot.longitude,
        altitudeM: positionSnapshot.altitudeM,
        accuracyM: positionSnapshot.accuracyM,
        speedMps: positionSnapshot.speedMps,
        courseBearingDeg: positionSnapshot.courseBearingDeg,
      };
      emit();
    });

    startGnssUpdates();
    const sub = addGnssStatusListener((status) => {
      latest = {
        ...(latest ?? { isNative: true, source: this.id, timestamp: Date.now(), fixQuality: "NO_FIX", satellitesVisible: 0, satellitesUsedInFix: 0, satellites: [] }),
        source: this.id,
        isNative: true,
        timestamp: status.timestamp,
        fixQuality: status.fixQuality,
        satellitesVisible: status.satellitesVisible,
        satellitesUsedInFix: status.satellitesUsedInFix,
        satellites: status.satellites,
      };
      emit();
    });

    return () => {
      stopPosition();
      sub.remove();
      stopGnssUpdates();
    };
  }
}
