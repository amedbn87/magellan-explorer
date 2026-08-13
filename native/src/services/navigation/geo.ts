export const EARTH_RADIUS_M = 6371008.8;

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export function distanceMeters(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Initial great-circle bearing, degrees 0..360 */
export function bearingDeg(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const phi1 = toRad(aLat);
  const phi2 = toRad(bLat);
  const dLambda = toRad(bLon - aLon);
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Relative bearing normalized to -180..180 (arrow rotation) */
export function normalizeRelativeBearing(targetBearing: number, currentHeading: number): number {
  let d = ((targetBearing - currentHeading + 540) % 360) - 180;
  if (Object.is(d, -180)) d = 180;
  return d;
}

export function formatDistance(m: number, unit: "metric" | "imperial" = "metric"): string {
  if (!Number.isFinite(m)) return "—";
  if (unit === "imperial") {
    const feet = m * 3.28084;
    if (feet < 528) return `${Math.round(feet)} ft`; // 0.1 mi
    return `${(feet / 5280).toFixed(feet < 52800 ? 2 : 1)} mi`;
  }
  if (m < 1000) return `${m < 10 ? m.toFixed(1) : Math.round(m)} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 2 : 1)} km`;
}

export function formatSpeed(mps: number, unit: "metric" | "imperial" = "metric"): string {
  if (!Number.isFinite(mps)) return "—";
  return unit === "imperial" ? `${(mps * 2.23694).toFixed(1)} mph` : `${(mps * 3.6).toFixed(1)} km/h`;
}

export function formatAltitude(m: number, unit: "metric" | "imperial" = "metric"): string {
  if (!Number.isFinite(m)) return "—";
  return unit === "imperial" ? `${Math.round(m * 3.28084)} ft` : `${m.toFixed(1)} m`;
}

export const CARDINALS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

export function cardinal(deg: number): string {
  return CARDINALS[Math.round((((deg % 360) + 360) % 360) / 45) % 8]!;
}

export function formatCoord(lat: number, lon: number, digits = 6): string {
  return `${lat.toFixed(digits)}, ${lon.toFixed(digits)}`;
}

function toDms(value: number, positiveSuffix: string, negativeSuffix: string): string {
  const suffix = value >= 0 ? positiveSuffix : negativeSuffix;
  const abs = Math.abs(value);
  const degrees = Math.floor(abs);
  const minutesFull = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFull);
  const seconds = (minutesFull - minutes) * 60;
  return `${degrees}°${minutes}'${seconds.toFixed(1)}"${suffix}`;
}

/** Degrees/minutes/seconds — matches the WGS84 DMS format shown throughout
 * the Stitch UI reference (e.g. `46°01'22.4"N`). */
export function formatCoordDms(lat: number, lon: number): { lat: string; lon: string } {
  return {
    lat: toDms(lat, "N", "S"),
    lon: toDms(lon, "E", "W"),
  };
}

export type CoordinateFormat = "decimal" | "dms";

export function formatCoordinates(
  lat: number,
  lon: number,
  format: CoordinateFormat,
): { primary: string; secondary?: string } {
  if (format === "dms") {
    const dms = formatCoordDms(lat, lon);
    return { primary: dms.lat, secondary: dms.lon };
  }
  return { primary: formatCoord(lat, lon) };
}

/** Arrival is a function of distance AND reported accuracy. */
export function isArrived(distanceM: number, accuracyM: number | undefined, threshold = 15) {
  const tolerance = Math.max(threshold, (accuracyM ?? threshold) * 1.5);
  return distanceM <= tolerance;
}
