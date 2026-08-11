# Magellan — Native (Expo / React Native)

Native Android rewrite of Magellan Explorer, replacing the Capacitor/WebView
build (`/` at repo root) that repeatedly froze on physical Android devices.
See the architecture decision and freeze root-cause analysis in the PR/commit
that introduced this folder.

## Why this exists (short version)

The web prototype at the repo root is built via Capacitor into an APK
(`codemagic.yaml`). Nine separate commits there patched GNSS throttling,
orientation-event debouncing, QR canvas rendering, and Leaflet re-init —
because all of that work shared one Chromium main thread with UI rendering.
This folder removes that shared thread structurally: GNSS/compass run as
native modules or on native sensor delivery paths, independent of the JS
thread that drives React Native's UI.

## Status — what's real right now

**Implemented and wired to real device data:**
- Position (lat/lon/alt/accuracy/speed/course) via `expo-location`
- Compass heading via `expo-sensors` Magnetometer
- Real per-satellite GNSS data (constellation, SVID, azimuth, elevation,
  C/N0, used-in-fix) via a custom native Kotlin Expo Module
  (`modules/magellan-gnss`) wrapping `android.location.GnssStatus` —
  **Android only**, no iOS equivalent exists, and it is never faked there
- Waypoints + Groups CRUD, persisted in `expo-sqlite`
- Navigation screen: real bearing/distance math, arrival detection
- Map location picker: MapLibre + keyless OSM demo tiles, tap-to-pin
- Share: QR generation via `react-native-qrcode-svg` (pure SVG, no canvas)
- Receive: real camera QR scan via `expo-camera`, strict payload validation
- Marine conditions: live Open-Meteo Weather + Marine API, no fabricated
  values — fields the API doesn't return show "Unavailable"
- Versioned `MGLN` v1 location payload, wire-compatible with the web
  prototype's `src/lib/magellan/payload.ts`

**Explicitly not implemented (and the UI says so, not fakes it):**
- Bluetooth, Wi-Fi Direct, local-network, NFC transports — `TRANSPORTS` in
  `src/services/transport/TransportManager.ts` reports each one's honest
  capability state
- History screen (data model + repository exist in `src/data/storage.ts`,
  no UI screen yet)
- iOS GNSS satellite detail (CoreLocation doesn't expose it — position-only
  via `ExpoLocationGnssProvider` is correct there, not a gap to fix)

## Validated so far in this environment

- `npx tsc --noEmit` — passes clean
- `npx expo config` — app.json + plugins resolve correctly, permissions
  merge as expected (camera plugin correctly adds `RECORD_AUDIO`, location
  plugin adds background location, etc.)
- `npx expo prebuild --platform android` — generates a valid Gradle project;
  `modules/magellan-gnss` autolinks correctly (confirmed via
  `expo-modules-autolinking resolve android`)
- A full `./gradlew assembleDebug` was **not** run here — this sandbox has no
  network path to `services.gradle.org` / Google's Maven repos, which is
  exactly the "no Android Studio locally" situation EAS Build solves. This
  is expected, not a defect.

## What is NOT yet done (be honest about this)

- **No APK has been built.** Run `eas build` (below) to produce one.
- **No physical-device testing has happened.** Per the project's own rule:
  do not consider this "fixed" until it's been tested on a real device,
  specifically the workflows that used to freeze (QR share/receive, map
  picker, live navigation).
- `eas.json` → `app.json` has a placeholder `extra.eas.projectId`. This
  requires an authenticated `eas init`, tied to your Expo account — it can't
  be fabricated from here.
- Dependency versions were pinned to what actually installed in this
  environment against Expo SDK 57 / RN 0.86, not hand-guessed. Run
  `npx expo install --check` once you have full registry access to confirm
  nothing has moved since.

## Build (no Android Studio required)

```bash
cd native
npm install

# One-time, from your machine, with your Expo account:
npx eas login
npx eas init          # fills in extra.eas.projectId in app.json
npx eas build:configure

# Cloud APK build (installable, unsigned/internal distribution):
npm run build:android:preview
# or for a dev client during active development:
npm run build:android:dev
```

Download the APK from the EAS build page or the link `eas build` prints,
install it on the physical device, and re-run the stress checklist below.

## Stress-test checklist (do this on the real device before calling it done)

- Repeatedly open/close the map picker and Share/Receive screens
- Scan several QR codes back-to-back on Receive
- Background and foreground the app mid-navigation
- Toggle airplane mode while on the Marine screen
- Deny then grant location/camera permission and confirm no crash/lockup
- Confirm the previously-freezing workflows (QR canvas, map re-init,
  high-frequency compass) stay responsive under all of the above

## Project layout

```
native/
├── app/                      # expo-router screens
│   ├── (tabs)/                Home, Waypoints, Groups, Satellites,
│   │                          Share, Receive, Marine, Settings
│   ├── navigate/[id].tsx      Live bearing/distance to a waypoint
│   └── map-picker.tsx         MapLibre tap-to-pin
├── modules/magellan-gnss/    # Kotlin Expo Module — real GnssStatus bridge
├── src/
│   ├── data/                  types, sqlite repositories
│   ├── services/
│   │   ├── gnss/               provider interface + Expo Location + native
│   │   ├── compass/            magnetometer heading
│   │   ├── navigation/         bearing/distance math
│   │   ├── transport/          MGLN payload + transport capability states
│   │   └── marine/             Open-Meteo client
│   ├── state/                  MagellanProvider (app-wide GNSS/compass context)
│   └── ui/                     shared screen chrome
└── eas.json
```
