import * as SQLite from "expo-sqlite";
import type { HistoryEntry, Waypoint, WaypointGroup } from "./types";

export type DistanceUnit = "metric" | "imperial";
export type CoordinateFormat = "decimal" | "dms";

export interface Preferences {
  distanceUnit: DistanceUnit;
  coordinateFormat: CoordinateFormat;
}

const DEFAULT_PREFERENCES: Preferences = { distanceUnit: "metric", coordinateFormat: "decimal" };

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("magellan.db").then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS groups (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          createdAt INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS waypoints (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          altitudeM REAL,
          accuracyM REAL,
          note TEXT,
          groupId TEXT,
          source TEXT,
          createdAt INTEGER NOT NULL,
          FOREIGN KEY (groupId) REFERENCES groups(id) ON DELETE SET NULL
        );
        CREATE TABLE IF NOT EXISTS history (
          id TEXT PRIMARY KEY,
          kind TEXT NOT NULL,
          transport TEXT NOT NULL,
          label TEXT NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          accuracyM REAL,
          at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS preferences (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
      return db;
    });
  }
  return dbPromise;
}

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

export const GroupsRepository = {
  async list(): Promise<WaypointGroup[]> {
    const db = await getDb();
    return db.getAllAsync<WaypointGroup>("SELECT * FROM groups ORDER BY createdAt DESC");
  },
  async create(name: string): Promise<WaypointGroup> {
    const db = await getDb();
    const group: WaypointGroup = { id: uid(), name, createdAt: Date.now() };
    await db.runAsync("INSERT INTO groups (id, name, createdAt) VALUES (?, ?, ?)", [
      group.id,
      group.name,
      group.createdAt,
    ]);
    return group;
  },
  async rename(id: string, name: string): Promise<void> {
    const db = await getDb();
    await db.runAsync("UPDATE groups SET name = ? WHERE id = ?", [name, id]);
  },
  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.runAsync("UPDATE waypoints SET groupId = NULL WHERE groupId = ?", [id]);
    await db.runAsync("DELETE FROM groups WHERE id = ?", [id]);
  },
};

export const WaypointsRepository = {
  async list(): Promise<Waypoint[]> {
    const db = await getDb();
    return db.getAllAsync<Waypoint>("SELECT * FROM waypoints ORDER BY createdAt DESC");
  },
  async listByGroup(groupId: string): Promise<Waypoint[]> {
    const db = await getDb();
    return db.getAllAsync<Waypoint>(
      "SELECT * FROM waypoints WHERE groupId = ? ORDER BY createdAt DESC",
      [groupId],
    );
  },
  async save(input: Omit<Waypoint, "id" | "createdAt">): Promise<Waypoint> {
    const db = await getDb();
    const waypoint: Waypoint = { ...input, id: uid(), createdAt: Date.now() };
    await db.runAsync(
      `INSERT INTO waypoints (id, name, latitude, longitude, altitudeM, accuracyM, note, groupId, source, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        waypoint.id,
        waypoint.name,
        waypoint.latitude,
        waypoint.longitude,
        waypoint.altitudeM ?? null,
        waypoint.accuracyM ?? null,
        waypoint.note ?? null,
        waypoint.groupId ?? null,
        waypoint.source ?? null,
        waypoint.createdAt,
      ],
    );
    return waypoint;
  },
  async update(id: string, patch: Partial<Omit<Waypoint, "id" | "createdAt">>): Promise<void> {
    const db = await getDb();
    const fields = Object.keys(patch);
    if (fields.length === 0) return;
    const setClause = fields.map((f) => `${f} = ?`).join(", ");
    const values: (string | number | null)[] = fields.map((f) => {
      const value = (patch as Record<string, unknown>)[f];
      return value === undefined ? null : (value as string | number | null);
    });
    await db.runAsync(`UPDATE waypoints SET ${setClause} WHERE id = ?`, [...values, id]);
  },
  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.runAsync("DELETE FROM waypoints WHERE id = ?", [id]);
  },
  async moveToGroup(id: string, groupId: string | null): Promise<void> {
    const db = await getDb();
    await db.runAsync("UPDATE waypoints SET groupId = ? WHERE id = ?", [groupId, id]);
  },
};

export const HistoryRepository = {
  async list(limit = 100): Promise<HistoryEntry[]> {
    const db = await getDb();
    return db.getAllAsync<HistoryEntry>("SELECT * FROM history ORDER BY at DESC LIMIT ?", [
      limit,
    ]);
  },
  async add(entry: Omit<HistoryEntry, "id">): Promise<HistoryEntry> {
    const db = await getDb();
    const record: HistoryEntry = { ...entry, id: uid() };
    await db.runAsync(
      `INSERT INTO history (id, kind, transport, label, latitude, longitude, accuracyM, at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.kind,
        record.transport,
        record.label,
        record.latitude,
        record.longitude,
        record.accuracyM ?? null,
        record.at,
      ],
    );
    return record;
  },
  async clear(): Promise<void> {
    const db = await getDb();
    await db.runAsync("DELETE FROM history");
  },
};

export const PreferencesRepository = {
  async get(): Promise<Preferences> {
    const db = await getDb();
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      "SELECT key, value FROM preferences",
    );
    const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      distanceUnit: (stored.distanceUnit as DistanceUnit) ?? DEFAULT_PREFERENCES.distanceUnit,
      coordinateFormat:
        (stored.coordinateFormat as CoordinateFormat) ?? DEFAULT_PREFERENCES.coordinateFormat,
    };
  },
  async set(patch: Partial<Preferences>): Promise<Preferences> {
    const db = await getDb();
    const entries = Object.entries(patch) as [keyof Preferences, string][];
    for (const [key, value] of entries) {
      await db.runAsync(
        "INSERT INTO preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [key, value],
      );
    }
    return PreferencesRepository.get();
  },
};
