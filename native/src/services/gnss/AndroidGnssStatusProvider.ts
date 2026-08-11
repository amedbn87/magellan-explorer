import { Platform } from "react-native";
import type { GnssSnapshot } from "../../data/types";
import type { GnssProvider } from "./GnssProvider";
import { emptySnapshot } from "./GnssProvider";
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
 *
 * Position and satellite data arrive on independent, differently-timed
 * streams, so each stream only ever writes the fields it owns — never the
 * whole snapshot — to avoid one stream's update stomping the other's latest
 * values.
 */
export class AndroidGnssStatusProvider implements GnssProvider {
  readonly id: GnssSnapshot["source"] = "AndroidGnssStatus";
  private position = new ExpoLocationGnssProvider();

  static isSupported(): boolean {
    return Platform.OS === "android" && isMagellanGnssAvailable();
  }

  subscribe(onSnapshot: (snapshot: GnssSnapshot) => void): () => void {
    let latest: GnssSnapshot = { ...emptySnapshot(this.id), isNative: true };

    const stopPosition = this.position.subscribe((positionSnapshot) => {
      latest = {
        ...latest,
        source: this.id,
        isNative: true,
        timestamp: positionSnapshot.timestamp,
        latitude: positionSnapshot.latitude,
        longitude: positionSnapshot.longitude,
        altitudeM: positionSnapshot.altitudeM,
        accuracyM: positionSnapshot.accuracyM,
        speedMps: positionSnapshot.speedMps,
        courseBearingDeg: positionSnapshot.courseBearingDeg,
      };
      onSnapshot(latest);
    });

    startGnssUpdates();
    const sub = addGnssStatusListener((status) => {
      latest = {
        ...latest,
        source: this.id,
        isNative: true,
        fixQuality: status.fixQuality,
        satellitesVisible: status.satellitesVisible,
        satellitesUsedInFix: status.satellitesUsedInFix,
        satellites: status.satellites,
      };
      onSnapshot(latest);
    });

    return () => {
      stopPosition();
      sub.remove();
      stopGnssUpdates();
    };
  }
}
