"use client";

import Dexie, { type EntityTable } from "dexie";

/**
 * IndexedDB cache for spoken instructions (BUILD_PLAN Stage 2): once a sentence has been
 * fetched from /api/speak it plays offline. Stage 5 adds the prescriptions / reminders /
 * dose_logs tables and the sync queue to the same database.
 */
export type AudioRow = { key: string; blob: Blob; mime: string; createdAt: number };

class MedisentDb extends Dexie {
  audio!: EntityTable<AudioRow, "key">;
  constructor() {
    super("medisent");
    this.version(1).stores({ audio: "key, createdAt" });
  }
}

let db: MedisentDb | null = null;
export function getDb(): MedisentDb | null {
  if (typeof indexedDB === "undefined") return null;
  db ??= new MedisentDb();
  return db;
}

export async function getCachedAudio(key: string): Promise<AudioRow | undefined> {
  try {
    return await getDb()?.audio.get(key);
  } catch {
    return undefined;
  }
}

export async function putCachedAudio(row: AudioRow): Promise<void> {
  try {
    await getDb()?.audio.put(row);
  } catch {
    // Private mode or quota: playing still works, only the cache is skipped.
  }
}

/** Same key the server uses (locale + trimmed text), computed with Web Crypto. */
export async function clientAudioKey(text: string, locale: string): Promise<string> {
  const data = new TextEncoder().encode(`${locale}:${text.trim()}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 40);
}
