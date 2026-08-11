import { Magnetometer } from "expo-sensors";

const normalizeHeading = (value: number) => ((value % 360) + 360) % 360;
const headingDelta = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

/** Magnetometer -> compass heading in degrees, 0 = North. */
function headingFromMagnetometer(x: number, y: number): number {
  let angle = Math.atan2(y, x) * (180 / Math.PI);
  angle = 90 - angle;
  return normalizeHeading(angle);
}

export interface CompassOptions {
  /** Minimum heading delta (deg) before emitting an update. Default 2. */
  minDeltaDeg?: number;
  /** Emission interval in ms even if heading is stable. Default 200. */
  intervalMs?: number;
}

/**
 * Subscribes to the device magnetometer and emits throttled, normalized
 * compass headings. Unlike the web prototype's `deviceorientation` listener,
 * this runs on the native sensor delivery path — throttling here is purely
 * to avoid needless re-renders, not to protect a shared UI thread.
 */
export function subscribeCompass(
  onHeading: (headingDeg: number) => void,
  options: CompassOptions = {},
): () => void {
  const minDelta = options.minDeltaDeg ?? 2;
  const interval = options.intervalMs ?? 200;

  let lastEmitted: number | undefined;
  let lastEmitAt = 0;

  Magnetometer.setUpdateInterval(interval);
  const sub = Magnetometer.addListener(({ x, y }) => {
    const heading = headingFromMagnetometer(x, y);
    const now = Date.now();
    if (lastEmitted !== undefined && headingDelta(heading, lastEmitted) < minDelta && now - lastEmitAt < interval * 3) {
      return;
    }
    lastEmitted = heading;
    lastEmitAt = now;
    onHeading(heading);
  });

  return () => sub.remove();
}
