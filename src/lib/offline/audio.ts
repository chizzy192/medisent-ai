"use client";

import Dexie, { type EntityTable } from "dexie";
import { AUDIO_CACHE_VERSION, SPEECH_SPEED, SPITCH_VOICE } from "@/config/voices";

/**
 * IndexedDB cache for spoken sentences (BUILD_PLAN Stage 2): once a sentence has been fetched
 * from /api/speak it plays offline. The key carries the voice and cache version, and a schema
 * bump wipes the table, so clips made with old voices never replay. Stage 5 adds the
 * prescriptions / reminders / dose_logs tables and the sync queue to the same database.
 */
export type AudioRow = { key: string; blob: Blob; mime: string; createdAt: number; provider: string };

class MedisentDb extends Dexie {
  audio!: EntityTable<AudioRow, "key">;
  constructor() {
    super("medisent");
    this.version(1).stores({ audio: "key, createdAt" });
    this.version(2)
      .stores({ audio: "key, createdAt, provider" })
      .upgrade((tx) => tx.table("audio").clear());
    // v3: English only, one voice; start the audio cache again.
    this.version(3)
      .stores({ audio: "key, createdAt, provider" })
      .upgrade((tx) => tx.table("audio").clear());
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

export async function clearCachedAudio(): Promise<void> {
  try {
    await getDb()?.audio.clear();
  } catch {
    /* ignore */
  }
}

/** Same key the server uses (version + voice + speed + trimmed text), via Web Crypto. */
export async function clientAudioKey(text: string): Promise<string> {
  const data = new TextEncoder().encode(`${AUDIO_CACHE_VERSION}:${SPITCH_VOICE}:${SPEECH_SPEED}:${text.trim()}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 40);
}
