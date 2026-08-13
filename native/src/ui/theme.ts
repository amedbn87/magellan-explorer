/**
 * Design tokens extracted verbatim from the Stitch UI reference export
 * (`stitch_magellan_professional_navigation_interface` branch, Material 3
 * dark color scheme + custom type/spacing scale). This is the single source
 * of truth for the app's visual language — screens should read from here,
 * never hardcode colors/spacing that duplicate it.
 *
 * The Stitch export itself is a static HTML/Tailwind mockup with no real
 * data or logic behind it; only the visual system was carried over here.
 * See MASTER UI/ENGINEERING INTEGRATION TASK section 3/6.
 */

export const colors = {
  background: "#081425",
  onBackground: "#D8E3FB",
  surface: "#081425",
  surfaceDim: "#081425",
  surfaceBright: "#2F3A4C",
  surfaceContainerLowest: "#040E1F",
  surfaceContainerLow: "#111C2D",
  surfaceContainer: "#152031",
  surfaceContainerHigh: "#1F2A3C",
  surfaceContainerHighest: "#2A3548",
  surfaceVariant: "#2A3548",
  onSurface: "#D8E3FB",
  onSurfaceVariant: "#C3C6D5",
  outline: "#8D909E",
  outlineVariant: "#434653",
  inverseSurface: "#D8E3FB",
  inverseOnSurface: "#263143",

  primary: "#B1C5FF",
  onPrimary: "#002C70",
  primaryContainer: "#0047AB",
  onPrimaryContainer: "#A5BDFF",
  inversePrimary: "#2559BD",

  secondary: "#FFB77D",
  onSecondary: "#4D2600",
  secondaryContainer: "#FD8B00",
  onSecondaryContainer: "#603100",

  tertiary: "#4AE183",
  onTertiary: "#003919",
  tertiaryContainer: "#005A2C",
  onTertiaryContainer: "#40D87C",

  error: "#FFB4AB",
  onError: "#690005",
  errorContainer: "#93000A",
  onErrorContainer: "#FFDAD6",

  // Semantic aliases used throughout the app — map onto the Material tokens
  // above so screens read intent, not raw palette entries.
  card: "#152031", // surfaceContainer
  border: "#434653", // outlineVariant
  subtext: "#C3C6D5", // onSurfaceVariant
  text: "#D8E3FB", // onSurface
  accent: "#B1C5FF", // primary
  good: "#4AE183", // tertiary — "3D FIX" / nominal status
  warn: "#FFB77D", // secondary — degraded / acquiring
  danger: "#FFB4AB", // error
} as const;

export const radius = {
  sm: 2,
  DEFAULT: 2,
  lg: 4,
  xl: 8,
  full: 12,
} as const;

export const spacing = {
  unit: 4,
  gutter: 16,
  marginMobile: 16,
  marginDesktop: 32,
  touchTargetMin: 48,
} as const;

// Stitch specifies Geist (headlines) / Inter (body/labels) / JetBrains Mono
// (data readouts). Geist isn't available via @expo-google-fonts as of this
// build, so headline text uses the platform system font at matching
// weight/size instead of silently substituting a different named font.
export const fontFamily = {
  body: "Inter_400Regular",
  bodyBold: "Inter_700Bold",
  labelCaps: "Inter_700Bold",
  dataMono: "JetBrainsMono_500Medium",
  instrument: undefined, // system font fallback — see comment above
} as const;

export const type = {
  instrumentXl: { fontSize: 48, lineHeight: 56, letterSpacing: -0.4, fontWeight: "700" as const },
  instrumentLg: { fontSize: 32, lineHeight: 40, letterSpacing: -0.3, fontWeight: "600" as const },
  instrumentMobile: { fontSize: 28, lineHeight: 34, fontWeight: "600" as const },
  bodyLg: { fontSize: 18, lineHeight: 28, fontWeight: "400" as const },
  bodyMd: { fontSize: 16, lineHeight: 24, fontWeight: "400" as const },
  dataMonoMd: { fontSize: 16, lineHeight: 24, fontWeight: "500" as const },
  dataMonoSm: { fontSize: 12, lineHeight: 16, fontWeight: "500" as const },
  labelCaps: { fontSize: 11, lineHeight: 16, letterSpacing: 0.6, fontWeight: "700" as const },
} as const;
