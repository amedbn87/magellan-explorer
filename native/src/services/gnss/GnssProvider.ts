import type { GnssSnapshot } from "../../data/types";

/**
 * Contract every GNSS source must satisfy. Never fabricate a value: if a
 * field is unavailable from the underlying platform API, omit it (undefined)
 * rather than inventing one. See MASTER PROMPT section 7.
 */
export interface GnssProvider {
  /** Human-readable id matching GnssSnapshot["source"] */
  readonly id: GnssSnapshot["source"];
  subscribe(onSnapshot: (snapshot: GnssSnapshot) => void): () => void;
}

export function emptySnapshot(source: GnssSnapshot["source"]): GnssSnapshot {
  return {
    isNative: false,
    source,
    timestamp: Date.now(),
    fixQuality: "NO_FIX",
    satellitesVisible: 0,
    satellitesUsedInFix: 0,
    satellites: [],
  };
}
