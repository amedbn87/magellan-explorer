import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";

type Coordinates = { latitude: number; longitude: number };

export function OpenStreetMapPicker({ initial, onConfirm }: { initial: Coordinates; onConfirm: (coords: Coordinates) => void }) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerRef = useRef<Leaflet.CircleMarker | null>(null);
  const [coords, setCoords] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((module) => {
      if (cancelled || !elementRef.current) return;
      const L = module.default;
      const map = L.map(elementRef.current, { zoomControl: true, attributionControl: true }).setView([initial.latitude, initial.longitude], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);
      const marker = L.circleMarker([initial.latitude, initial.longitude], { radius: 9, weight: 2 }).addTo(map);
      const update = (lat: number, lng: number) => {
        marker.setLatLng([lat, lng]);
        setCoords({ latitude: lat, longitude: lng });
      };
      map.on("click", (event) => update(event.latlng.lat, event.latlng.lng));
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        update(p.lat, p.lng);
      });
      marker.options.interactive = true;
      marker.dragging?.enable();
      mapRef.current = map;
      markerRef.current = marker;
      setLoading(false);
      window.setTimeout(() => map.invalidateSize(), 0);
    }).catch((e: unknown) => {
      if (!cancelled) { setLoading(false); setError(e instanceof Error ? e.message : "Map unavailable"); }
    });
    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [initial.latitude, initial.longitude]);

  if (error) return <div className="rounded-lg border border-destructive/30 bg-card p-4 text-sm text-destructive">{error}</div>;
  return <div className="space-y-3">
    <div ref={elementRef} className="h-72 w-full overflow-hidden rounded-lg border border-border bg-muted" aria-label="OpenStreetMap location picker" />
    {loading ? <p className="text-xs text-muted-foreground">Loading OpenStreetMap…</p> : null}
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm">
      <MapPin className="h-4 w-4 shrink-0 text-primary" />
      <span className="numeric flex-1">{coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}</span>
      <Button size="sm" onClick={() => onConfirm(coords)} disabled={loading}>Use this location</Button>
    </div>
    <p className="text-[11px] text-muted-foreground">Map tiles: OpenStreetMap. No Google API key is required.</p>
  </div>;
}
