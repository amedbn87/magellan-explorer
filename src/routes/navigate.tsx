import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Navigation2 } from "lucide-react";
import { useMagellan } from "@/lib/magellan/store";
import { PageHeader, Stat } from "@/components/magellan/primitives";
import { DemoBadge, SimulatedNotice } from "@/components/magellan/DemoBadge";
import { bearingDeg, cardinal, distanceMeters, formatCoord, formatDistance, isArrived, normalizeRelativeBearing } from "@/lib/magellan/geo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MarineConditions } from "@/components/magellan/MarineConditions";

export const Route = createFileRoute("/navigate")({
  head: () => ({ meta: [{ title: "Navigation — Magellan" }, { name: "description", content: "Real-time destination direction, distance, speed, heading and location details." }] }),
  component: NavigatePage,
});

function NavigatePage() {
  const { snapshot, waypoints, groups, activeWaypointId, setActiveWaypointId, heading, headingSource, t } = useMagellan();

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("waypoint");
    if (id && waypoints.some((w) => w.id === id)) setActiveWaypointId(id);
  }, [setActiveWaypointId, waypoints]);

  const target = waypoints.find((w) => w.id === activeWaypointId) ?? null;
  const group = target?.groupId ? groups.find((g) => g.id === target.groupId) : undefined;
  const hasFix = snapshot.latitude !== undefined && snapshot.longitude !== undefined;
  const distance = target && hasFix ? distanceMeters(snapshot.latitude!, snapshot.longitude!, target.latitude, target.longitude) : undefined;
  const targetBearing = target && hasFix ? bearingDeg(snapshot.latitude!, snapshot.longitude!, target.latitude, target.longitude) : undefined;
  const relative = targetBearing !== undefined && heading !== undefined ? normalizeRelativeBearing(targetBearing, heading) : undefined;
  const arrived = distance !== undefined && isArrived(distance, snapshot.accuracyM);
  const state = !target ? t("idle") : arrived ? t("arrived") : t("navigating");

  return (
    <div className="space-y-5">
      <PageHeader title={t("nav_navigate")} description="Live destination guidance using geographic bearing and device heading." actions={<DemoBadge label={t("simulated")} />} />
      <SimulatedNotice>
        Browser builds use available device orientation; native GNSS/sensor values are shown only when actually supplied by the runtime. No direction is fabricated when heading is unavailable.
      </SimulatedNotice>

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="label-eyebrow">Destination</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {waypoints.map((w) => <button key={w.id} onClick={() => setActiveWaypointId(w.id)} className={cn("rounded-full border border-border px-3 py-1 text-xs", activeWaypointId === w.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary")}>{w.name}</button>)}
          {activeWaypointId ? <button onClick={() => setActiveWaypointId(null)} className="rounded-full border border-border px-3 py-1 text-xs">Clear</button> : null}
          {waypoints.length === 0 ? <Button asChild size="sm" variant="outline"><Link to="/waypoints">Create a location</Link></Button> : null}
        </div>
        {target ? <div className="mt-4 grid gap-3 sm:grid-cols-4"><Stat label="Group" value={group?.name ?? "Ungrouped"} /><Stat label="Destination" value={target.name} /><Stat label="Latitude" value={target.latitude.toFixed(6)} /><Stat label="Longitude" value={target.longitude.toFixed(6)} /></div> : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="grid place-items-center rounded-lg border border-border bg-card p-6">
          <div className="relative grid h-56 w-56 place-items-center rounded-full border border-border">
            {["N", "E", "S", "W"].map((c, i) => <span key={c} className="absolute text-xs font-semibold text-muted-foreground" style={{ transform: `rotate(${i * 90}deg) translateY(-6.6rem) rotate(${-i * 90}deg)` }}>{c}</span>)}
            {relative !== undefined ? <Navigation2 aria-label={`Direction arrow, ${relative.toFixed(0)} degrees relative`} className={cn("h-24 w-24 transition-transform duration-300", arrived ? "text-signal-strong" : "text-primary")} style={{ transform: `rotate(${relative}deg)` }} strokeWidth={1.5} /> : <span className="max-w-[10rem] text-center text-xs text-muted-foreground">{target ? "Heading unavailable — arrow hidden instead of fabricated." : t("idle")}</span>}
          </div>
          <p className={cn("mt-4 rounded-full px-3 py-1 text-sm font-medium", arrived ? "bg-signal-strong/15 text-signal-strong" : "bg-secondary")}>{state}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label={t("distance")} value={distance !== undefined ? formatDistance(distance) : undefined} />
          <Stat label={t("targetBearing")} value={targetBearing?.toFixed(0)} unit={`° ${targetBearing !== undefined ? cardinal(targetBearing) : ""}`} />
          <Stat label={t("heading")} value={heading?.toFixed(0)} unit="°" hint={headingSource === "unavailable" ? "No source" : `Source: ${headingSource}`} />
          <Stat label={t("relativeBearing")} value={relative !== undefined ? `${relative > 0 ? "+" : ""}${relative.toFixed(0)}` : undefined} unit="°" hint="−180…180" />
          <Stat label="Speed" value={snapshot.speedMps?.toFixed(1)} unit="m/s" />
          <Stat label="Speed" value={snapshot.speedMps !== undefined ? (snapshot.speedMps * 3.6).toFixed(1) : undefined} unit="km/h" />
          <Stat label={t("accuracy")} value={snapshot.accuracyM?.toFixed(1)} unit="m" />
          <Stat label="Altitude" value={snapshot.altitudeM?.toFixed(1)} unit="m" />
          <Stat label="Fix" value={snapshot.fixQuality} />
          <Stat className="col-span-2 sm:col-span-3" label="Destination coordinates" value={target ? formatCoord(target.latitude, target.longitude) : undefined} hint={target?.note ?? undefined} />
          <Stat className="col-span-2 sm:col-span-3" label="Current position timestamp" value={new Date(snapshot.timestamp).toLocaleString()} hint="Hour, minute and second are derived from the stored timestamp." />
          {target ? <Stat className="col-span-2 sm:col-span-3" label="Saved at" value={new Date(target.createdAt).toLocaleString()} hint={`Source: ${target.source ?? "manual"}`} /> : null}
        </div>
      </div>
      {target ? <MarineConditions latitude={target.latitude} longitude={target.longitude} compact /> : null}
    </div>
  );
}
