import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";

type Coordinates = { latitude: number; longitude: number };

export function OpenStreetMapPicker({ initial, onConfirm }: { initial: Coordinates; onConfirm: (coords: Coordinates) => void }) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerRef = useRef<Leaflet.Marker | null>(null);
  const [coords, setCoords] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  useEffect(() => {
    let cancelled = false;
    const frames: number[] = [];
    // Android WebView: creating the map, attaching tiles and adding the marker in
    // one synchronous block is a single long task that blocks paint and input.
    // Split the work across committed animation frames, same paint-gating
    // pattern used by QrCanvas.
    const nextFrame = (fn: () => void) => {
      frames.push(window.requestAnimationFrame(() => { if (!cancelled) fn(); }));
    };
    void import("leaflet").then((module) => {
      if (cancelled || !elementRef.current || mapRef.current) return;
      const L = module.default;
      nextFrame(() => {
        if (!elementRef.current || mapRef.current) return;
        const map = L.map(elementRef.current, { zoomControl: true, attributionControl: true, preferCanvas: false }).setView([initial.latitude, initial.longitude], 13);
        mapRef.current = map;
        nextFrame(() => {
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(map);
          nextFrame(() => {
            const marker = L.marker([initial.latitude, initial.longitude], { draggable: true }).addTo(map);
            const update = (lat: number, lng: number) => { marker.setLatLng([lat, lng]); setCoords({ latitude: lat, longitude: lng }); };
            map.on("click", (event) => update(event.latlng.lat, event.latlng.lng));
            marker.on("dragend", () => { const p = marker.getLatLng(); update(p.lat, p.lng); });
            markerRef.current = marker;
            setLoading(false);
            nextFrame(() => map.invalidateSize({ animate: false }));
          });
        });
      });
    }).catch((e: unknown) => { if (!cancelled) { setLoading(false); setError(e instanceof Error ? e.message : "Map unavailable"); } });
    return () => {
      cancelled = true;
      for (const id of frames) window.cancelAnimationFrame(id);
      markerRef.current?.remove(); markerRef.current = null;
      mapRef.current?.remove(); mapRef.current = null;
    };
    // The map is a long-lived native-like widget. Do not recreate it on every GNSS update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <div className="rounded-lg border border-destructive/30 bg-card p-4 text-sm text-destructive">{error}</div>;
  return <div className="space-y-3"><div ref={elementRef} className="h-72 w-full overflow-hidden rounded-lg border border-border bg-muted" aria-label="OpenStreetMap location picker" />{loading ? <p className="text-xs text-muted-foreground">Loading OpenStreetMap…</p> : null}<div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm"><MapPin className="h-4 w-4 shrink-0 text-primary" /><span className="numeric flex-1">{coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}</span><Button size="sm" onClick={() => onConfirmRef.current(coords)} disabled={loading}>Use this location</Button></div><p className="text-[11px] text-muted-foreground">Map tiles: OpenStreetMap. No Google API key is required.</p></div>;
}
