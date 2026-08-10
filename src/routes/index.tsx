import { createFileRoute, Link } from "@tanstack/react-router";
import { Satellite, QrCode, Navigation, Radar, Compass, MapPin, FolderOpen } from "lucide-react";
import { useMemo } from "react";
import { useMagellan } from "@/lib/magellan/store";
import { PageHeader, Section, Stat, cn0Bg } from "@/components/magellan/primitives";
import { DemoBadge, SimulatedNotice } from "@/components/magellan/DemoBadge";
import { cardinal, distanceMeters, formatCoord, formatDistance } from "@/lib/magellan/geo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Magellan Explorer" }, { name: "description", content: "Compass-first GNSS location explorer with nearby locations and navigation." }] }),
  component: Index,
});

function Index() {
  const { snapshot, waypoints, groups, t, heading, headingSource } = useMagellan();
  const s = snapshot;
  const byConstellation = new Map<string, { v: number; u: number }>();
  for (const sat of s.satellites) {
    const e = byConstellation.get(sat.constellation) ?? { v: 0, u: 0 };
    e.v += 1;
    if (sat.usedInFix) e.u += 1;
    byConstellation.set(sat.constellation, e);
  }

  const nearby = useMemo(() => {
    if (s.latitude === undefined || s.longitude === undefined) return waypoints.slice(0, 8);
    return [...waypoints]
      .map((w) => ({ waypoint: w, distance: distanceMeters(s.latitude!, s.longitude!, w.latitude, w.longitude) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8);
  }, [s.latitude, s.longitude, waypoints]);

  const compass = heading;

  return (
    <div className="space-y-6">
      <PageHeader title={t("app")} description="Compass-first location explorer and GNSS dashboard." actions={<DemoBadge label={t("simulated")} />} />
      <SimulatedNotice />

      <Section title="Compass" aside={<span className="text-xs text-muted-foreground">{headingSource === "unavailable" ? "Unavailable" : `Source: ${headingSource}`}</span>}>
        <div className="grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)]">
          <div className="grid place-items-center rounded-xl border border-border bg-card p-5">
            <div className="relative grid h-44 w-44 place-items-center rounded-full border-2 border-border">
              {["N", "E", "S", "W"].map((label, i) => (
                <span key={label} className="absolute text-sm font-bold" style={{ transform: `rotate(${i * 90}deg) translateY(-5rem) rotate(${-i * 90}deg)` }}>{label}</span>
              ))}
              <Compass className="h-28 w-28 text-primary transition-transform duration-200" style={{ transform: `rotate(${compass !== undefined ? compass : 0}deg)` }} aria-label={compass !== undefined ? `Heading ${compass.toFixed(0)} degrees` : "Heading unavailable"} />
            </div>
            <div className="numeric mt-3 text-2xl font-semibold">{compass !== undefined ? `${compass.toFixed(0)}° ${cardinal(compass)}` : "—"}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Heading" value={compass?.toFixed(0)} unit="°" hint={headingSource === "unavailable" ? "Sensor unavailable" : headingSource === "compass" ? "Device orientation" : "GNSS course"} />
            <Stat label="Speed" value={s.speedMps?.toFixed(1)} unit="m/s" />
            <Stat label="Latitude" value={s.latitude?.toFixed(6)} />
            <Stat label="Longitude" value={s.longitude?.toFixed(6)} />
          </div>
        </div>
      </Section>

      <Section title="Nearby locations" aside={<Link className="text-xs text-primary" to="/waypoints">Manage all</Link>}>
        <div className="space-y-2">
          {nearby.map(({ waypoint, distance }) => {
            const group = groups.find((g) => g.id === waypoint.groupId);
            return (
              <button key={waypoint.id} className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left hover:bg-secondary" onClick={() => { window.location.assign(`/navigate?waypoint=${encodeURIComponent(waypoint.id)}`); }}>
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{waypoint.name}</span><span className="block truncate text-xs text-muted-foreground">{group?.name ?? "Ungrouped"}</span></span>
                <span className="numeric text-sm font-medium">{formatDistance(distance)}</span>
              </button>
            );
          })}
          {nearby.length === 0 ? <p className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">No saved locations yet.</p> : null}
        </div>
      </Section>

      <Section title="Location overview">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Saved locations" value={waypoints.length} />
          <Stat label="Groups" value={groups.length} />
          <Stat label={t("accuracy")} value={s.accuracyM?.toFixed(1)} unit="m" />
          <Stat label={t("altitude")} value={s.altitudeM?.toFixed(0)} unit="m" />
        </div>
        <div className="mt-3 rounded-lg border border-border bg-card p-4"><div className="label-eyebrow">Current coordinates (WGS84)</div><p className="numeric mt-1 text-xl font-semibold">{s.latitude !== undefined && s.longitude !== undefined ? formatCoord(s.latitude, s.longitude) : "Unavailable"}</p><p className="mt-1 text-xs text-muted-foreground">Updated {new Date(s.timestamp).toLocaleString()}</p></div>
      </Section>

      <Section title={t("section_signal")}>
        <div className="grid grid-cols-2 gap-3"><Stat label={t("visible")} value={s.satellitesVisible} /><Stat label={t("used")} value={s.satellitesUsedInFix} /></div>
        <ul className="space-y-2 rounded-lg border border-border bg-card p-3">{[...byConstellation.entries()].map(([c, e]) => <li key={c} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><div className="min-w-0"><div className="truncate text-sm font-medium">{c}</div><div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted"><div className={`h-full ${cn0Bg(40)}`} style={{ width: `${(e.u / Math.max(1, e.v)) * 100}%` }} /></div></div><span className="numeric shrink-0 text-sm text-muted-foreground">{e.u}/{e.v}</span></li>)}</ul>
      </Section>

      <Section title="Quick actions">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickAction to="/waypoints" icon={MapPin} label="Locations" />
          <QuickAction to="/waypoints" icon={FolderOpen} label="Groups" />
          <QuickAction to="/share" icon={QrCode} label={t("nav_share")} />
          <QuickAction to="/navigate" icon={Navigation} label={t("nav_navigate")} />
          <QuickAction to="/satellites" icon={Satellite} label={t("nav_satellites")} />
          <QuickAction to="/sky" icon={Radar} label={t("nav_sky")} />
        </div>
      </Section>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: typeof Satellite; label: string }) {
  return <Button asChild variant="outline" className="h-auto justify-start gap-2 py-3"><Link to={to}><Icon className="h-4 w-4 shrink-0" aria-hidden /><span className="truncate text-xs">{label}</span></Link></Button>;
}
