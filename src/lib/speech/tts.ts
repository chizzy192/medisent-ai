import { createHash } from "node:crypto";
import { AUDIO_CACHE_VERSION, SPEECH_SPEED, SPITCH_LANGUAGE, SPITCH_VOICE } from "@/config/voices";
import { createAdminClient } from "@/lib/db/admin";

/**
 * Server-side text-to-speech (English only): one Spitch system voice at speed 0.9. Each
 * sentence is synthesised once and cached in the private `audio-cache` bucket (row in
 * audio_cache); the browser keeps its own copy in IndexedDB. The cache key carries the voice
 * and version, so a voice change never replays an old clip.
 */
export type TtsResult = { bytes: Uint8Array; mime: string; provider: "spitch"; cached: boolean; voice: string };

export function audioKey(text: string): string {
  return createHash("sha256").update(`${AUDIO_CACHE_VERSION}:${SPITCH_VOICE}:${SPEECH_SPEED}:${text.trim()}`).digest("hex").slice(0, 40);
}

export function isTtsConfigured(): boolean {
  return Boolean(process.env.SPITCH_API_KEY);
}

async function spitch(text: string, attempt = 1): Promise<TtsResult | null> {
  const key = process.env.SPITCH_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.spitch.app/v1/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text, language: SPITCH_LANGUAGE, voice: SPITCH_VOICE, format: "mp3", speed: SPEECH_SPEED }),
    signal: AbortSignal.timeout(45_000),
  }).catch(() => null);
  // One retry on a network drop or a 5xx: the first call of a session has failed this way before.
  if ((!res || res.status >= 500) && attempt === 1) return spitch(text, 2);
  if (!res || !res.ok || !(res.headers.get("content-type") ?? "").startsWith("audio/")) {
    console.warn(`[tts] spitch ${SPITCH_VOICE}: ${res?.status ?? "network"} ${res ? (await res.text().catch(() => "")).slice(0, 160) : ""}`);
    return null;
  }
  return { bytes: new Uint8Array(await res.arrayBuffer()), mime: "audio/mpeg", provider: "spitch", cached: false, voice: SPITCH_VOICE };
}

/** Synthesise with the cache in front; null when Spitch did not answer. */
export async function synthesize(text: string): Promise<TtsResult | null> {
  const key = audioKey(text);
  const admin = createAdminClient();

  const { data: hit } = await admin.from("audio_cache").select("path,provider,mime").eq("key", key).maybeSingle();
  if (hit) {
    const { data: file } = await admin.storage.from("audio-cache").download(hit.path);
    if (file) return { bytes: new Uint8Array(await file.arrayBuffer()), mime: hit.mime, provider: "spitch", cached: true, voice: SPITCH_VOICE };
  }

  const result = await spitch(text);
  if (!result) return null;

  const path = `${AUDIO_CACHE_VERSION}/${key}.mp3`;
  const up = await admin.storage.from("audio-cache").upload(path, result.bytes, { contentType: result.mime, upsert: true });
  if (!up.error) await admin.from("audio_cache").upsert({ key, path, provider: result.provider, mime: result.mime });
  return result;
}
