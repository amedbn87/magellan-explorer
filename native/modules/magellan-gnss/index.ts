import { requireNativeModule, NativeModule, Platform } from "expo-modules-core";
import type { GnssSnapshot } from "../../src/data/types";

type NativeGnssStatusEvent = Omit<GnssSnapshot, "source" | "isNative">;
type GnssEventMap = { onGnssStatus: (event: NativeGnssStatusEvent) => void };

// requireNativeModule returns a NativeModule instance, which already
// implements the EventEmitter interface (addListener/removeListener) — no
// need to wrap it in a second EventEmitter.
declare class MagellanGnssNativeModule extends NativeModule<GnssEventMap> {
  isAvailable(): boolean;
  startUpdates(): void;
  stopUpdates(): void;
}

const isAndroid = Platform.OS === "android";

// requireNativeModule throws if the native module isn't linked (e.g. Expo
// Go, or a dev client built before this module was added). Guard it so the
// rest of the app can fall back to ExpoLocationGnssProvider cleanly instead
// of crashing.
let native: MagellanGnssNativeModule | null = null;
if (isAndroid) {
  try {
    native = requireNativeModule<MagellanGnssNativeModule>("MagellanGnss");
  } catch {
    native = null;
  }
}

export function isMagellanGnssAvailable(): boolean {
  return !!native && native.isAvailable();
}

export function startGnssUpdates(): void {
  native?.startUpdates();
}

export function stopGnssUpdates(): void {
  native?.stopUpdates();
}

export function addGnssStatusListener(
  listener: (event: NativeGnssStatusEvent) => void,
): { remove: () => void } {
  if (!native) return { remove: () => {} };
  const sub = native.addListener("onGnssStatus", listener);
  return { remove: () => sub.remove() };
}
