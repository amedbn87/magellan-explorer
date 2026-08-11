export interface MarineConditions {
  latitude: number;
  longitude: number;
  observedAt: string;
  windSpeedKmh?: number | undefined;
  windDirectionDeg?: number | undefined;
  pressureHpa?: number | undefined;
  airTemperatureC?: number | undefined;
  waveHeightM?: number | undefined;
  wavePeriodS?: number | undefined;
  waveDirectionDeg?: number | undefined;
  seaTemperatureC?: number | undefined;
  currentSpeedKmh?: number | undefined;
  currentDirectionDeg?: number | undefined;
  sunrise?: string | undefined;
  sunset?: string | undefined;
  fishingActivity: "Low" | "Moderate" | "High" | "Unavailable";
  fishingActivityReason: string;
  source: string;
}

interface WeatherResponse {
  latitude: number;
  longitude: number;
  current?: {
    time?: string;
    temperature_2m?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    pressure_msl?: number;
  };
  daily?: {
    sunrise?: string[];
    sunset?: string[];
  };
}

interface MarineResponse {
  latitude: number;
  longitude: number;
  current?: {
    time?: string;
    wave_height?: number;
    wave_period?: number;
    wave_direction?: number;
    sea_surface_temperature?: number;
    ocean_current_velocity?: number;
    ocean_current_direction?: number;
  };
}

const WEATHER_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const MARINE_ENDPOINT = "https://marine-api.open-meteo.com/v1/marine";

function finite(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function moonAge(date: Date): number {
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
  const synodicMonth = 29.530588853;
  const days = (date.getTime() - knownNewMoon) / 86400000;
  return ((days % synodicMonth) + synodicMonth) % synodicMonth;
}

function fishingActivity(input: {
  now: Date;
  windKmh?: number | undefined;
  waveM?: number | undefined;
  pressure?: number | undefined;
  sunrise?: string | undefined;
  sunset?: string | undefined;
}): { level: MarineConditions["fishingActivity"]; reason: string } {
  const factors: number[] = [];
  if (input.windKmh !== undefined) factors.push(input.windKmh <= 18 ? 2 : input.windKmh <= 30 ? 1 : 0);
  if (input.waveM !== undefined) factors.push(input.waveM <= 0.8 ? 2 : input.waveM <= 1.5 ? 1 : 0);
  if (input.pressure !== undefined) factors.push(input.pressure >= 1008 && input.pressure <= 1025 ? 2 : input.pressure >= 995 ? 1 : 0);

  const age = moonAge(input.now);
  const nearMajorMoon = age < 1.5 || Math.abs(age - 14.765) < 1.5 || Math.abs(age - 29.53) < 1.5;
  const sunrise = input.sunrise ? new Date(input.sunrise).getTime() : NaN;
  const sunset = input.sunset ? new Date(input.sunset).getTime() : NaN;
  const now = input.now.getTime();
  const nearSolunar = [sunrise, sunset].some((t) => Number.isFinite(t) && Math.abs(now - t) <= 2 * 3600000);
  if (nearMajorMoon) factors.push(2); else factors.push(1);
  if (nearSolunar) factors.push(2);

  if (!factors.length) return { level: "Unavailable", reason: "Insufficient live weather data." };
  const score = factors.reduce((sum, value) => sum + value, 0) / (factors.length * 2);
  if (score >= 0.72) return { level: "High", reason: "Favorable wind/waves with a favorable solunar window." };
  if (score >= 0.45) return { level: "Moderate", reason: "Mixed conditions; some fishing factors are favorable." };
  return { level: "Low", reason: "Wind, waves, pressure, or timing are less favorable." };
}

export async function fetchMarineConditions(latitude: number, longitude: number, signal?: AbortSignal): Promise<MarineConditions> {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(5),
    longitude: longitude.toFixed(5),
    current: "temperature_2m,wind_speed_10m,wind_direction_10m,pressure_msl",
    daily: "sunrise,sunset",
    timezone: "auto",
    forecast_days: "1",
  });
  const marineParams = new URLSearchParams({
    latitude: latitude.toFixed(5),
    longitude: longitude.toFixed(5),
    current: "wave_height,wave_period,wave_direction,sea_surface_temperature,ocean_current_velocity,ocean_current_direction",
    timezone: "auto",
    forecast_days: "1",
  });

  const [weatherResponse, marineResponse] = await Promise.all([
    fetch(`${WEATHER_ENDPOINT}?${params.toString()}`, { signal: signal ?? null }),
    fetch(`${MARINE_ENDPOINT}?${marineParams.toString()}`, { signal: signal ?? null }),
  ]);
  if (!weatherResponse.ok) throw new Error(`Weather service returned HTTP ${weatherResponse.status}`);
  if (!marineResponse.ok) throw new Error(`Marine service returned HTTP ${marineResponse.status}`);

  const weather = (await weatherResponse.json()) as WeatherResponse;
  const marine = (await marineResponse.json()) as MarineResponse;
  const now = new Date();
  const sunrise = weather.daily?.sunrise?.[0];
  const sunset = weather.daily?.sunset?.[0];
  const activity = fishingActivity({
    now,
    windKmh: finite(weather.current?.wind_speed_10m),
    waveM: finite(marine.current?.wave_height),
    pressure: finite(weather.current?.pressure_msl),
    sunrise,
    sunset,
  });

  return {
    latitude: marine.latitude ?? weather.latitude,
    longitude: marine.longitude ?? weather.longitude,
    observedAt: marine.current?.time ?? weather.current?.time ?? now.toISOString(),
    windSpeedKmh: finite(weather.current?.wind_speed_10m),
    windDirectionDeg: finite(weather.current?.wind_direction_10m),
    pressureHpa: finite(weather.current?.pressure_msl),
    airTemperatureC: finite(weather.current?.temperature_2m),
    waveHeightM: finite(marine.current?.wave_height),
    wavePeriodS: finite(marine.current?.wave_period),
    waveDirectionDeg: finite(marine.current?.wave_direction),
    seaTemperatureC: finite(marine.current?.sea_surface_temperature),
    currentSpeedKmh: finite(marine.current?.ocean_current_velocity),
    currentDirectionDeg: finite(marine.current?.ocean_current_direction),
    sunrise,
    sunset,
    fishingActivity: activity.level,
    fishingActivityReason: activity.reason,
    source: "Open-Meteo Weather + Marine API; fishing activity is a calculated indicator, not a fish observation.",
  };
}
