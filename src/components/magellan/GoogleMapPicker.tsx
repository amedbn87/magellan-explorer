import { useEffect, useRef, useState } from "react";
import { MapPin, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    google?: typeof google;
  }
}

type Coordinates = { latitude: number; longitude: number };

let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (googleMapsPromise) return googleMapsPromise;
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (!key) return Promise.reject(new Error("VITE_GOOGLE_MAPS_API_KEY is not configured."));

  googleMapsPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-magellan-google-maps="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google Maps failed to load.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.dataset.magellanGoogleMaps = "true";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps failed to load."));
    document.head.appendChild(script);
  });
  return googleMapsPromise;
}

export function GoogleMapPicker({ initial, onConfirm }: { initial: Coordinates; onConfirm: (coords: Coordinates) => void }) {
  const mapElement = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [coords, setCoords] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void loadGoogleMaps()
      .then(() => {
        if (cancelled || !mapElement.current || !window.google?.maps) return;
        const position = { lat: initial.latitude, lng: initial.longitude };
        const map = new window.google.maps.Map(mapElement.current, {
          center: position,
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        const marker = new window.google.maps.Marker({ position, map, draggable: true, title: "Magellan destination" });
        mapRef.current = map;
        markerRef.current = marker;
        marker.addListener("dragend", () => {
          const p = marker.getPosition();
          if (!p) return;
          setCoords({ latitude: p.lat(), longitude: p.lng() });
        });
        map.addListener("click", (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) return;
          marker.setPosition(event.latLng);
          setCoords({ latitude: event.latLng.lat(), longitude: event.latLng.lng() });
        });
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setLoading(false);
          setError(e instanceof Error ? e.message : "Google Maps unavailable.");
        }
      });

    return () => {
      cancelled = true;
      if (markerRef.current) markerRef.current.setMap(null);
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [initial.latitude, initial.longitude]);

  if (error) {
    return (
      <div className="space-y-3 rounded-lg border border-destructive/30 bg-card p-4">
        <div className="flex gap-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Configure VITE_GOOGLE_MAPS_API_KEY for the interactive picker. Your saved coordinate model does not depend on the map provider.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div ref={mapElement} className="h-72 w-full overflow-hidden rounded-lg border border-border bg-muted" aria-label="Google map location picker" />
      {loading ? <p className="text-xs text-muted-foreground">Loading Google Maps…</p> : null}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm">
        <MapPin className="h-4 w-4 shrink-0 text-primary" />
        <span className="numeric flex-1">{coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}</span>
        <Button size="sm" onClick={() => onConfirm(coords)} disabled={loading}>Use this location</Button>
      </div>
    </div>
  );
}
