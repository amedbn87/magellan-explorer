import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { useMagellan } from "@/lib/magellan/store";
import { PageHeader } from "@/components/magellan/primitives";
import { DemoBadge, SimulatedNotice } from "@/components/magellan/DemoBadge";
import { QrCanvas } from "@/components/magellan/QrCanvas";
import { encodeLocationPayload, MAGELLAN_PAYLOAD_VERSION } from "@/lib/magellan/payload";
import type { LocationPayloadV1 } from "@/lib/magellan/payload-types";
import { TRANSPORTS, TRANSPORT_STATE_LABEL, send } from "@/lib/magellan/transports";
import type { GnssSnapshot, TransportId } from "@/lib/magellan/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/share")({
  head: () => ({
    meta: [
      { title: "Share Location — Magellan" },
      { name: "description", content: "Generate a real scannable QR code for the versioned Magellan location payload and pick a transport." },
      { property: "og:title", content: "Share Location — Magellan" },
      { property: "og:description", content: "Versioned MGLN v1 location payload sharing." },
    ],
  }),
  component: SharePage,
});

function SharePage() {
  const { snapshot, waypoints, addHistory, t } = useMagellan();
  const [sourceId, setSourceId] = useState<string>("live");
  const [name, setName] = useState("Magellan location");
  const [note, setNote] = useState("");
  const [transport, setTransport] = useState<TransportId>("qr");
  const [capturedLiveSnapshot, setCapturedLiveSnapshot] = useState<GnssSnapshot | null>(null);
  const [qrValue, setQrValue] = useState("");

  // A share is a point-in-time snapshot. Do not feed the continuously updating
  // GNSS state directly into QR rendering; doing so makes Android WebView
  // regenerate a canvas QR every tick and can freeze the UI.
  useEffect(() => {
    if (capturedLiveSnapshot) return;
    if (snapshot.latitude === undefined || snapshot.longitude === undefined) return;
    setCapturedLiveSnapshot(snapshot);
  }, [snapshot, capturedLiveSnapshot]);

  const payload: LocationPayloadV1 | null = useMemo(() => {
    if (sourceId === "live") {
      if (!capturedLiveSnapshot || capturedLiveSnapshot.latitude === undefined || capturedLiveSnapshot.longitude === undefined) return null;
      return {
        t: "MGLN",
        v: MAGELLAN_PAYLOAD_VERSION,
        lat: Number(capturedLiveSnapshot.latitude.toFixed(6)),
        lon: Number(capturedLiveSnapshot.longitude.toFixed(6)),
        alt: capturedLiveSnapshot.altitudeM != null ? Number(capturedLiveSnapshot.altitudeM.toFixed(1)) : undefined,
        acc: capturedLiveSnapshot.accuracyM != null ? Number(capturedLiveSnapshot.accuracyM.toFixed(1)) : undefined,
        ts: Math.floor(capturedLiveSnapshot.timestamp / 1000),
        name: name || undefined,
        note: note || undefined,
        src: "demo",
      };
    }
    const wp = waypoints.find((w) => w.id === sourceId);
    if (!wp) return null;
    return {
      t: "MGLN",
      v: MAGELLAN_PAYLOAD_VERSION,
      lat: wp.latitude,
      lon: wp.longitude,
      alt: wp.altitudeM,
      ts: Math.floor(wp.createdAt / 1000),
      name: name || wp.name,
      note: note || wp.note,
      src: "waypoint",
    };
  }, [sourceId, capturedLiveSnapshot, waypoints, name, note]);

  useEffect(() => {
    let cancelled = false;
    if (!payload) {
      setQrValue("");
      return;
    }
    const encoded = encodeLocationPayload(payload);
    const timer = window.setTimeout(() => {
      if (!cancelled) setQrValue(encoded);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [payload]);

  const active = TRANSPORTS.find((tr) => tr.id === transport) ?? TRANSPORTS[0];

  function handleSend() {
    if (!payload) return;
    const result = send(transport, payload);
    if (result.ok) {
      addHistory({
        kind: "shared",
        transport,
        label: payload.name ?? "Shared location",
        latitude: payload.lat,
        longitude: payload.lon,
        accuracyM: payload.acc,
      });
      toast.success("QR payload generated", { description: "Scan it with the Magellan receiver." });
    } else {
      toast.error("Transport not available in the web prototype", { description: result.reason });
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t("nav_share")} description="One versioned payload (MGLN v1) travels over every transport." actions={<DemoBadge label="DEMO PAYLOAD" />} />
      <SimulatedNotice>
        The QR image below is genuinely generated and scannable. The coordinates inside it come from demo data, not from a real GNSS fix.
      </SimulatedNotice>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-border bg-card p-4">
          <div className="space-y-2">
            <Label htmlFor="src">Location source</Label>
            <select id="src" value={sourceId} onChange={(e) => setSourceId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="live">Current demo position</option>
              {waypoints.map((w) => <option key={w.id} value={w.id}>Waypoint · {w.name}</option>)}
            </select>
          </div>
          <div className="space-y-2"><Label htmlFor="name">Label</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={64} /></div>
          <div className="space-y-2"><Label htmlFor="note">Note (optional)</Label><Input id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={160} /></div>
          <div className="space-y-2">
            <Label>Transport</Label>
            <div className="grid gap-2">
              {TRANSPORTS.map((tr) => (
                <button key={tr.id} type="button" onClick={() => setTransport(tr.id)} className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border p-2 text-start", transport === tr.id ? "border-primary bg-secondary" : "border-border")}>
                  <span className="min-w-0"><span className="block truncate text-sm font-medium">{tr.name}</span><span className="block truncate text-[11px] text-muted-foreground">{tr.detail}</span></span>
                  <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px]">{TRANSPORT_STATE_LABEL[tr.state]}</span>
                </button>
              ))}
            </div>
          </div>
          <Button className="w-full" onClick={handleSend} disabled={!payload}>Send via {active.name}</Button>
        </div>

        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          <h2 className="label-eyebrow">QR presentation</h2>
          {qrValue ? (
            <>
              <QrCanvas value={qrValue} />
              <div className="rounded-md border border-border bg-muted/40 p-3"><div className="label-eyebrow">Encoded payload</div><pre className="numeric mt-1 overflow-x-auto text-[11px] whitespace-pre-wrap break-all">{qrValue}</pre></div>
              <Button variant="outline" className="w-full" onClick={() => {
                if (!navigator.clipboard?.writeText) { toast.error("Clipboard is unavailable on this device"); return; }
                void navigator.clipboard.writeText(qrValue).then(() => toast.success("Payload copied — paste it in Receive location")).catch(() => toast.error("Could not copy payload"));
              }}>Copy payload</Button>
            </>
          ) : <p className="text-sm text-muted-foreground">No position available, so no QR can be generated.</p>}
        </div>
      </div>
    </div>
  );
}
