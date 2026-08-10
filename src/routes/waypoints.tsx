import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { MapPin, Pencil, Trash2, Navigation, FolderPlus, Map } from "lucide-react";
import { useMagellan } from "@/lib/magellan/store";
import { PageHeader } from "@/components/magellan/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCoord, distanceMeters, formatDistance } from "@/lib/magellan/geo";
import type { Waypoint } from "@/lib/magellan/types";
import { GoogleMapPicker } from "@/components/magellan/GoogleMapPicker";

export const Route = createFileRoute("/waypoints")({ head: () => ({ meta: [{ title: "Locations & Groups — Magellan" }] }), component: WaypointsPage });
const empty = { name: "", lat: "", lon: "", note: "", groupId: "", source: "manual" as "manual" | "live" | "map" | "demo" };
type AddMode = "current" | "map" | null;

function WaypointsPage() {
  const { waypoints, groups, addWaypoint, updateWaypoint, deleteWaypoint, addGroup, updateGroup, deleteGroup, setActiveWaypointId, snapshot } = useMagellan();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [groupName, setGroupName] = useState("");
  const [editingGroup, setEditingGroup] = useState<string | null>(null);

  const sortedWaypoints = useMemo(() => {
    if (snapshot.latitude === undefined || snapshot.longitude === undefined) return waypoints;
    return [...waypoints].sort((a, b) => distanceMeters(snapshot.latitude!, snapshot.longitude!, a.latitude, a.longitude) - distanceMeters(snapshot.latitude!, snapshot.longitude!, b.latitude, b.longitude));
  }, [snapshot.latitude, snapshot.longitude, waypoints]);

  function cancelEditor() { setEditing(null); setAddMode(null); setForm(empty); }
  function fillCurrent() {
    if (snapshot.latitude === undefined || snapshot.longitude === undefined) return void toast.error("Current GNSS position is unavailable");
    setForm((current) => ({ ...current, lat: String(snapshot.latitude), lon: String(snapshot.longitude), source: snapshot.isNative ? "live" : "demo" }));
    setAddMode("current");
  }
  function saveForm(e: React.FormEvent) {
    e.preventDefault();
    const lat = Number(form.lat), lon = Number(form.lon);
    if (!form.name.trim()) return void toast.error("Name is required");
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return void toast.error("Latitude must be −90…90");
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) return void toast.error("Longitude must be −180…180");
    const data = { name: form.name.trim(), latitude: lat, longitude: lon, note: form.note.trim() || undefined, groupId: form.groupId || undefined, source: form.source, altitudeM: snapshot.altitudeM, accuracyM: snapshot.accuracyM };
    if (editing) { updateWaypoint(editing, data); toast.success("Location updated"); } else { addWaypoint(data); toast.success("Location saved"); }
    cancelEditor();
  }
  function beginEdit(w: Waypoint) { setEditing(w.id); setAddMode(null); setForm({ name: w.name, lat: String(w.latitude), lon: String(w.longitude), note: w.note ?? "", groupId: w.groupId ?? "", source: w.source ?? "manual" }); }
  function saveMapLocation(coords: { latitude: number; longitude: number }) { setForm((current) => ({ ...current, lat: String(coords.latitude), lon: String(coords.longitude), source: "map" })); setAddMode("map"); }

  return <div className="space-y-5">
    <PageHeader title="Locations & Groups" description="Nearby-first waypoint management with persistent groups." />
    <section className="rounded-lg border border-border bg-card p-4"><div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="font-semibold">Groups</h2><p className="text-xs text-muted-foreground">Organize fishing spots, areas, trips, or any collection of locations.</p></div><FolderPlus className="h-5 w-5 text-primary" /></div><div className="flex gap-2"><Input value={groupName} placeholder="New group name" onChange={(e) => setGroupName(e.target.value)} /><Button onClick={() => { const g = addGroup(groupName); if (!g) return void toast.error("Enter a unique group name"); setGroupName(""); toast.success("Group created"); }}>Add group</Button></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{groups.map((g) => { const count = waypoints.filter((w) => w.groupId === g.id).length; return <div key={g.id} className="rounded-md border border-border p-3">{editingGroup === g.id ? <div className="flex gap-2"><Input defaultValue={g.name} id={`group-${g.id}`} /><Button size="sm" onClick={() => { const el = document.getElementById(`group-${g.id}`) as HTMLInputElement | null; if (el?.value.trim()) updateGroup(g.id, el.value); setEditingGroup(null); }}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEditingGroup(null)}>Cancel</Button></div> : <div className="flex items-center gap-2"><div className="min-w-0 flex-1"><p className="truncate font-medium">{g.name}</p><p className="text-xs text-muted-foreground">{count} location{count === 1 ? "" : "s"}</p></div><Button size="icon" variant="ghost" onClick={() => setEditingGroup(g.id)} aria-label={`Edit ${g.name}`}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => { deleteGroup(g.id); toast.success("Group deleted; locations preserved"); }} aria-label={`Delete ${g.name}`}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>}</div>; })}{groups.length === 0 ? <p className="text-xs text-muted-foreground">No groups yet.</p> : null}</div></section>
    <section className="rounded-lg border border-border bg-card p-4"><div className="mb-3"><h2 className="font-semibold">Add location</h2><p className="text-xs text-muted-foreground">Choose the real current GNSS position or select a point on Google Maps.</p></div><div className="grid gap-2 sm:grid-cols-2"><Button variant="outline" onClick={fillCurrent}>Use current location</Button><Button variant="outline" onClick={() => setAddMode("map")}><Map className="mr-2 h-4 w-4" />Select on Google Maps</Button></div>{addMode === "map" ? <div className="mt-4"><GoogleMapPicker initial={{ latitude: snapshot.latitude ?? 24.7136, longitude: snapshot.longitude ?? 46.6753 }} onConfirm={saveMapLocation} /><Button className="mt-2" type="button" variant="ghost" onClick={cancelEditor}>Cancel map selection</Button></div> : null}</section>
    {(addMode === "current" || addMode === "map" || editing) ? <form onSubmit={saveForm} className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2"><div className="space-y-1.5 sm:col-span-2"><Label htmlFor="wname">Location name</Label><Input id="wname" autoFocus value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} /></div><div className="space-y-1.5"><Label htmlFor="wlat">Latitude</Label><Input id="wlat" inputMode="decimal" value={form.lat} onChange={(e) => setForm((current) => ({ ...current, lat: e.target.value }))} /></div><div className="space-y-1.5"><Label htmlFor="wlon">Longitude</Label><Input id="wlon" inputMode="decimal" value={form.lon} onChange={(e) => setForm((current) => ({ ...current, lon: e.target.value }))} /></div><div className="space-y-1.5"><Label htmlFor="wgroup">Group</Label><select id="wgroup" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.groupId} onChange={(e) => setForm((current) => ({ ...current, groupId: e.target.value }))}><option value="">Ungrouped</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div><div className="space-y-1.5"><Label htmlFor="wnote">Note</Label><Input id="wnote" value={form.note} onChange={(e) => setForm((current) => ({ ...current, note: e.target.value }))} /></div><div className="flex flex-wrap gap-2 sm:col-span-2"><Button type="submit">{editing ? "Save changes" : "Save location"}</Button><Button type="button" variant="ghost" onClick={cancelEditor}>Cancel</Button></div></form> : null}
    <section className="space-y-2"><h2 className="font-semibold">Nearby locations</h2><ul className="space-y-2">{sortedWaypoints.map((w) => { const d = snapshot.latitude !== undefined && snapshot.longitude !== undefined ? distanceMeters(snapshot.latitude, snapshot.longitude, w.latitude, w.longitude) : undefined; const group = groups.find((g) => g.id === w.groupId); return <li key={w.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-card p-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-secondary"><MapPin className="h-4 w-4 text-primary" /></span><div className="min-w-0"><p className="truncate text-sm font-medium">{w.name}</p><p className="text-xs text-muted-foreground">{group?.name ?? "Ungrouped"} · {formatCoord(w.latitude, w.longitude, 6)}</p><p className="numeric text-xs text-muted-foreground">{d !== undefined ? formatDistance(d) : "Distance unavailable"}</p></div></div><div className="flex shrink-0 items-center gap-1"><Button size="icon" variant="ghost" aria-label={`Navigate to ${w.name}`} onClick={() => { setActiveWaypointId(w.id); void navigate({ to: "/navigate" }); }}><Navigation className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label={`Edit ${w.name}`} onClick={() => beginEdit(w)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label={`Delete ${w.name}`} onClick={() => { deleteWaypoint(w.id); toast.success("Location deleted"); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></li>; })}{sortedWaypoints.length === 0 ? <li className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No locations yet.</li> : null}</ul></section>
  </div>;
}
