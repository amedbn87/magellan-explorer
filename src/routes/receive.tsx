import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Camera, CheckCircle2, XCircle } from "lucide-react";
import { useMagellan } from "@/lib/magellan/store";
import { PageHeader } from "@/components/magellan/primitives";
import { DemoBadge } from "@/components/magellan/DemoBadge";
import { decodeLocationPayload, encodeLocationPayload } from "@/lib/magellan/payload";
import type { LocationPayloadV1 } from "@/lib/magellan/payload-types";
import { QrWorkerView } from "@/components/magellan/QrWorkerView";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatCoord } from "@/lib/magellan/geo";

export const Route = createFileRoute("/receive")({ head: () => ({ meta: [{ title: "Receive Location — Magellan" }, { name: "description", content: "Decode a Magellan MGLN v1 payload, reject malformed data, then navigate, save or re-share it." }] }), component: ReceivePage });
const SAMPLE_VALID = encodeLocationPayload({ t: "MGLN", v: 1, lat: 24.7419, lon: 46.6231, alt: 605, acc: 4.5, ts: 1767225600, name: "Desert camp", src: "demo" });
const SAMPLE_BAD_VERSION = '{"t":"MGLN","v":7,"lat":24.7,"lon":46.6,"ts":1767225600}';
const SAMPLE_GARBAGE = "https://example.com/not-a-magellan-code";

function ReceivePage() {
  const { addWaypoint, addHistory, setActiveWaypointId, t } = useMagellan();
  const navigate = useNavigate();
  const [raw, setRaw] = useState("");
  const [payload, setPayload] = useState<LocationPayloadV1 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  function decode(text: string) { setRaw(text); const result = decodeLocationPayload(text); if (result.ok) { setPayload(result.payload); setError(null); } else { setPayload(null); setError(result.error); } }
  function simulateScan(text: string) { setScanning(true); window.setTimeout(() => { setScanning(false); decode(text); }, 300); }
  return <div className="space-y-5">
    <PageHeader title={t("nav_receive")} description="Malformed or foreign codes are rejected — never partially guessed." actions={<DemoBadge label="CAMERA SIMULATED" />} />
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 className="label-eyebrow">Scanner</h2>
        <div className="relative grid aspect-square place-items-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/40"><div className="absolute inset-6 rounded-lg border-2 border-primary/60" />{scanning ? <div className="absolute inset-x-6 top-6 h-0.5 bg-primary" /> : null}<div className="z-10 px-6 text-center"><Camera className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden /><p className="mt-2 text-xs text-muted-foreground">Native camera preview is simulated in this web prototype. Payload decoding remains deterministic and does not block the UI.</p></div></div>
        <div className="grid gap-2 sm:grid-cols-3"><Button size="sm" onClick={() => simulateScan(SAMPLE_VALID)}>Scan valid code</Button><Button size="sm" variant="outline" onClick={() => simulateScan(SAMPLE_BAD_VERSION)}>Scan wrong version</Button><Button size="sm" variant="outline" onClick={() => simulateScan(SAMPLE_GARBAGE)}>Scan foreign QR</Button></div>
        <div className="space-y-2"><label htmlFor="paste" className="label-eyebrow">Or paste a payload</label><Textarea id="paste" rows={4} value={raw} placeholder='{"t":"MGLN","v":1,...}' onChange={(e) => decode(e.target.value)} className="numeric text-xs" /></div>
      </div>
      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 className="label-eyebrow">Result</h2>
        {error ? <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm"><XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden /><span>{error}</span></div> : null}
        {payload ? <div className="space-y-3"><div className="flex items-center gap-2 text-sm text-signal-strong"><CheckCircle2 className="h-4 w-4" aria-hidden /> Valid MGLN v{payload.v} payload</div><dl className="grid grid-cols-2 gap-2 text-sm"><Row label="Name" value={payload.name ?? "—"} /><Row label="Coordinates" value={formatCoord(payload.lat, payload.lon)} /><Row label="Altitude" value={payload.alt !== undefined ? `${payload.alt} m` : "Unavailable"} /><Row label="Accuracy" value={payload.acc !== undefined ? `${payload.acc} m` : "Unavailable"} /><Row label="Timestamp" value={new Date(payload.ts * 1000).toLocaleString()} /><Row label="Source" value={payload.src} /></dl><div className="grid gap-2 sm:grid-cols-3"><Button onClick={() => { const wp = addWaypoint({ name: payload.name ?? "Received location", latitude: payload.lat, longitude: payload.lon, altitudeM: payload.alt, note: payload.note }); setActiveWaypointId(wp.id); addHistory({ kind: "received", transport: "qr", label: wp.name, latitude: wp.latitude, longitude: wp.longitude, accuracyM: payload.acc }); void navigate({ to: "/navigate" }); }}>Navigate to it</Button><Button variant="outline" onClick={() => { addWaypoint({ name: payload.name ?? "Received location", latitude: payload.lat, longitude: payload.lon, altitudeM: payload.alt, note: payload.note }); toast.success("Saved as waypoint"); }}>Save waypoint</Button><Button variant="outline" onClick={() => { if (!navigator.clipboard?.writeText) return void toast.error("Clipboard unavailable"); void navigator.clipboard.writeText(encodeLocationPayload(payload)).then(() => toast.success("Payload copied for re-sharing")).catch(() => toast.error("Could not copy payload")); }}>Share again</Button></div><div><div className="label-eyebrow mb-2">Re-shared QR</div><QrWorkerView value={encodeLocationPayload(payload)} size={180} /></div></div> : !error ? <p className="text-sm text-muted-foreground">Nothing decoded yet. Simulate a scan or paste a payload.</p> : null}
      </div>
    </div>
  </div>;
}
function Row({ label, value }: { label: string; value: string }) { return <div className="rounded-md border border-border p-2"><dt className="label-eyebrow">{label}</dt><dd className="numeric mt-0.5 break-all">{value}</dd></div>; }
