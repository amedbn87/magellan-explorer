export type Constellation =
  | "GPS"
  | "GALILEO"
  | "GLONASS"
  | "BEIDOU"
  | "QZSS"
  | "SBAS"
  | "IRNSS"
  | "UNKNOWN";

/** Mirrors android.location.GnssStatus per-satellite fields.
 *  Fields that Android may not report are optional and must stay
 *  `undefined` (rendered as "unavailable") — never fabricated. */
export interface SatelliteInfo {
  id: string;
  constellation: Constellation;
  svid: number;
  azimuthDeg: number;
  elevationDeg: number;
  cn0DbHz: number;
  usedInFix: boolean;
  carrierFrequencyHz?: number | undefined;
  basebandCn0DbHz?: number | undefined;
  hasAlmanac?: boolean | undefined;
  hasEphemeris?: boolean | undefined;
}

export type FixQuality = "NO_FIX" | "ACQUIRING" | "2D" | "3D" | "DGNSS";

export interface GnssSnapshot {
  isNative: boolean;
  source: "DemoGnssProvider" | "AndroidGnssStatus";
  timestamp: number;
  latitude?: number | undefined;
  longitude?: number | undefined;
  altitudeM?: number | undefined;
  accuracyM?: number | undefined;
  speedMps?: number | undefined;
  courseBearingDeg?: number | undefined;
  compassHeadingDeg?: number | undefined;
  fixQuality: FixQuality;
  satellitesVisible: number;
  satellitesUsedInFix: number;
  satellites: SatelliteInfo[];
}

export interface WaypointGroup {
  id: string;
  name: string;
  createdAt: number;
}

export interface Waypoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  altitudeM?: number | undefined;
  accuracyM?: number | undefined;
  note?: string | undefined;
  groupId?: string | undefined;
  source?: "live" | "map" | "manual" | "received" | undefined;
  createdAt: number;
}

export type HistoryKind = "shared" | "received" | "navigated";

export interface HistoryEntry {
  id: string;
  kind: HistoryKind;
  transport: TransportId;
  label: string;
  latitude: number;
  longitude: number;
  accuracyM?: number | undefined;
  at: number;
}

export type TransportId = "qr" | "bluetooth" | "wifi-direct" | "local-network" | "nfc";

export type TransportState =
  | "SUPPORTED"
  | "AVAILABLE"
  | "CONNECTED"
  | "READY"
  | "PERMISSION_REQUIRED"
  | "UNAVAILABLE";

export interface TransportDescriptor {
  id: TransportId;
  name: string;
  detail: string;
  state: TransportState;
  worksInBrowser: boolean;
}