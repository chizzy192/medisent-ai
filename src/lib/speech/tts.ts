import { createHash } from "node:crypto";
import type { Locale } from "@/config/locales";
import { createAdminClient } from "@/lib/db/admin";

/**
 * Server-side text-to-speech (BUILD_PLAN section 2): Spitch for ig / yo / ha / en, 9jaLingo for
 * Pidgin with Spitch's Pidgin voice as the fallback. Each sentence is synthesised once and
 * cached in the private `audio-cache` bucket (row in audio_cache); the browser keeps its own
 * copy in IndexedDB. When no provider answers, the caller falls back to the browser voice.
 */
export type TtsResult = { bytes: Uint8Array; mime: string; provider: string; cached: boolean };

const spitchVoices: Record<Locale, { language: string; voice: string }> = {
  en: { language: "en", voice: "lucy" },
  ig: { language: "ig", voice: "ngozi" },
  yo: { language: "yo", voice: "sade" },
  ha: { language: "ha", voice: "amina" },
  pcm: { language: "pi", voice: "boma" },
};

export function audioKey(text: string, locale: Locale): string {
  return createHash("sha256").update(`${locale}:${text.trim()}`).digest("hex").slice(0, 40);
}

export function isTtsConfigured(locale: Locale): boolean {
  return locale === "pcm" ? Boolean(process.env.NAIJALINGO_API_KEY || process.env.SPITCH_API_KEY) : Boolean(process.env.SPITCH_API_KEY);
}

async function spitch(text: string, locale: Locale): Promise<TtsResult | null> {
  const key = process.env.SPITCH_API_KEY;
  if (!key) return null;
  const v = spitchVoices[locale];
  const res = await fetch("https://api.spitch.app/v1/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text, language: v.language, voice: v.voice, format: "mp3" }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    console.warn(`[tts] spitch ${locale}: ${res.status}`);
    return null;
  }
  return { bytes: new Uint8Array(await res.arrayBuffer()), mime: "audio/mpeg", provider: "spitch", cached: false };
}

async function naijaLingo(text: string): Promise<TtsResult | null> {
  const key = process.env.NAIJALINGO_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.9jalingo.org/v1/audio/speech", {
    method: "POST",
    headers: { "X-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ input: text, voice: "ada_pcm", lang: "pcm", model: "9jalingo-tts-1", response_format: "mp3" }),
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  if (!res || !res.ok || !(res.headers.get("content-type") ?? "").startsWith("audio/")) {
    console.warn(`[tts] 9jalingo: ${res?.status ?? "network"}`);
    return null;
  }
  return { bytes: new Uint8Array(await res.arrayBuffer()), mime: "audio/mpeg", provider: "9jalingo", cached: false };
}

/** Synthesise with the cache in front; null when every provider failed (use the browser voice). */
export async function synthesize(text: string, locale: Locale): Promise<TtsResult | null> {
  const key = audioKey(text, locale);
  const admin = createAdminClient();

  const { data: hit } = await admin.from("audio_cache").select("path,provider,mime").eq("key", key).maybeSingle();
  if (hit) {
    const { data: file } = await admin.storage.from("audio-cache").download(hit.path);
    if (file) return { bytes: new Uint8Array(await file.arrayBuffer()), mime: hit.mime, provider: hit.provider, cached: true };
  }

  let result: TtsResult | null = null;
  if (locale === "pcm") result = (await naijaLingo(text)) ?? (await spitch(text, locale));
  else result = await spitch(text, locale);
  if (!result) return null;

  const path = `${locale}/${key}.mp3`;
  const up = await admin.storage.from("audio-cache").upload(path, result.bytes, { contentType: result.mime, upsert: true });
  if (!up.error) await admin.from("audio_cache").upsert({ key, path, provider: result.provider, language: locale, mime: result.mime });
  return result;
}
