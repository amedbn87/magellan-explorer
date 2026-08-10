import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ScanLine } from "lucide-react";
import { useMagellan } from "@/lib/magellan/store";
import { PageHeader } from "@/components/magellan/primitives";
import { QrCanvas } from "@/components/magellan/QrCanvas";
import { encodeLocationPayload, MAGELLAN_PAYLOAD_VERSION } from "@/lib/magellan/payload";
import type { LocationPayloadV1 } from "@/lib/magellan/payload-types";
import { TRANSPORTS, TRANSPORT_STATE_LABEL, send } from "@/lib/magellan/transports";
import type { GnssSnapshot, TransportId } from "@/lib/magellan/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/share")({ head: () => ({ meta: [{ title: "Share Location — Magellan" }] }), component: SharePage });

function SharePage() {
  const { snapshot, waypoints, addHistory, t } = useMagellan();
  const [sourceId, setSourceId] = useState("live");
  const [name, setName] = useState("Magellan location");
  const [note, setNote] = useState("");
  const [transport, setTransport] = useState<TransportId>("qr");
  const [captured, setCaptured] = useState<GnssSnapshot | null>(null);
  const [qrValue, setQrValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (captured || snapshot.latitude === undefined || snapshot.longitude === undefined) return;
    setCaptured(snapshot);
  }, [snapshot, captured]);

  const payload: LocationPayloadV1 | null = useMemo(() => {
    if (sourceId === "live") {
      if (!captured || captured.latitude === undefined || captured.longitude === undefined) return null;
      return { t: "MGLN", v: MAGELLAN_PAYLOAD_VERSION, lat: captured.latitude, lon: captured.longitude, alt: captured.altitudeM, acc: captured.accuracyM, ts: Math.floor(captured.timestamp / 1000), name: name.trim() || undefined, note: note.trim() || undefined, src: captured.isNative ? "live" : "demo" };
    }
    const wp = waypoints.find((w) => w.id === sourceId);
    if (!wp) return null;
    return { t: "MGLN", v: MAGELLAN_PAYLOAD_VERSION, lat: wp.latitude, lon: wp.longitude, alt: wp.altitudeM, ts: Math.floor(wp.createdAt / 1000), name: name.trim() || wp.name, note: note.trim() || wp.note, src: "waypoint" };
  }, [sourceId, captured, waypoints, name, note]);

  const active = TRANSPORTS.find((tr) => tr.id === transport) ?? TRANSPORTS[0];
  function generateQr() {
    if (!payload) return void toast.error("No valid location is available");
    setIsGenerating(true); setQrValue(encodeLocationPayload(payload));
    window.setTimeout(() => setIsGenerating(false), 0);
  }
  function handleSend() {
    if (!payload) return;
    if (transport === "qr" && !qrValue) return void toast.error("Generate the QR code first");
    const result = send(transport, payload);
    if (result.ok) { addHistory({ kind: "shared", transport, label: payload.name ?? "Shared location", latitude: payload.lat, longitude: payload.lon, accuracyM: payload.acc }); toast.success("Location ready to share"); }
    else toast.error("Transport unavailable", { description: result.reason });
  }

  return <div className="space-y-5">
    <PageHeader title={t("nav_share")} description="Prepare a point-in-time MGLN v1 payload without heavy work during page load." actions={<Button asChild variant="outline"><Link to="/receive"><ScanLine className="mr-2 h-4 w-4" />Receive Locations</Link></Button>} />
    <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">QR generation is explicit. Opening and editing this screen does not start QR encoding. Use <Link className="font-medium text-primary underline" to="/receive">Receive Locations</Link> to scan, paste, save, navigate to, or re-share a received MGLN location.</div>
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <div className="space-y-2"><Label htmlFor="src">Location source</Label><select id="src" value={sourceId} onChange={(e) => { setSourceId(e.target.value); setQrValue(""); }} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="live">Current location</option>{waypoints.map((w) => <option key={w.id} value={w.id}>Location · {w.name}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="name">Label</Label><Input id="name" value={name} onChange={(e) => { setName(e.target.value); setQrValue(""); }} maxLength={64} /></div>
        <div className="space-y-2"><Label htmlFor="note">Note</Label><Input id="note" value={note} onChange={(e) => { setNote(e.target.value); setQrValue(""); }} maxLength={160} /></div>
        <div className="space-y-2"><Label>Transport</Label><div className="grid gap-2">{TRANSPORTS.map((tr) => <button key={tr.id} type="button" onClick={() => setTransport(tr.id)} className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border p-2 text-start", transport === tr.id ? "border-primary bg-secondary" : "border-border")}><span className="min-w-0"><span className="block truncate text-sm font-medium">{tr.name}</span><span className="block truncate text-[11px] text-muted-foreground">{tr.detail}</span></span><span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px]">{TRANSPORT_STATE_LABEL[tr.state]}</span></button>)}</div></div>
        <div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={generateQr} disabled={!payload || isGenerating}>{isGenerating ? "Preparing…" : qrValue ? "Regenerate QR" : "Generate QR"}</Button><Button onClick={handleSend} disabled={!payload || (transport === "qr" && !qrValue)}>Send via {active.name}</Button></div>
      </div>
      <div className="space-y-3 rounded-lg border border-border bg-card p-4"><h2 className="label-eyebrow">QR presentation</h2>{qrValue ? <><QrCanvas value={qrValue} /><div className="rounded-md border border-border bg-muted/40 p-3"><div className="label-eyebrow">Encoded payload</div><pre className="numeric mt-1 overflow-x-auto whitespace-pre-wrap break-all text-[11px]">{qrValue}</pre></div><Button variant="outline" className="w-full" onClick={() => { if (!navigator.clipboard?.writeText) return void toast.error("Clipboard unavailable"); void navigator.clipboard.writeText(qrValue).then(() => toast.success("Payload copied")).catch(() => toast.error("Could not copy payload")); }}>Copy payload</Button></> : <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">The QR is not generated yet. This screen remains interactive until you explicitly request it.</div>}</div>
    </div>
  </div>;
}
