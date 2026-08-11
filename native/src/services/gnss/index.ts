import type { GnssProvider } from "./GnssProvider";
import { ExpoLocationGnssProvider } from "./ExpoLocationGnssProvider";
import { AndroidGnssStatusProvider } from "./AndroidGnssStatusProvider";

export type { GnssProvider } from "./GnssProvider";
export { emptySnapshot } from "./GnssProvider";
export { initialGnssSnapshot } from "./ExpoLocationGnssProvider";

/**
 * Returns the richest real GNSS provider available on this device:
 * 1. AndroidGnssStatus (native module) — full satellite/constellation data.
 * 2. ExpoLocation — position-only, works everywhere (Android fallback, iOS).
 *
 * There is intentionally no demo/simulated fallback here. If satellite data
 * is unavailable, satellitesVisible/satellites stay empty and the UI must
 * show "Unavailable", not invented numbers.
 */
export function createGnssProvider(): GnssProvider {
  if (AndroidGnssStatusProvider.isSupported()) {
    return new AndroidGnssStatusProvider();
  }
  return new ExpoLocationGnssProvider();
}
