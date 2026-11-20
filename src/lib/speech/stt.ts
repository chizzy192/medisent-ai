/**
 * Speech to text through Spitch (English). The browser records WebM/Opus or MP4/AAC with
 * MediaRecorder; Spitch accepts the file as multipart. Returns the transcript or throws.
 */
export function isSttConfigured(): boolean {
  return Boolean(process.env.SPITCH_API_KEY);
}

export async function transcribe(audio: Uint8Array, mime: string): Promise<string> {
  const key = process.env.SPITCH_API_KEY;
  if (!key) throw new Error("SPITCH_API_KEY is not set");
  const ext = mime.includes("mp4") || mime.includes("m4a") ? "m4a" : mime.includes("ogg") ? "ogg" : mime.includes("wav") ? "wav" : "webm";
  const form = new FormData();
  form.append("language", "en");
  form.append("content", new Blob([audio as BlobPart], { type: mime }), `speech.${ext}`);
  const res = await fetch("https://api.spitch.app/v1/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`spitch stt ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const json = (await res.json()) as { text?: string; transcript?: string };
  return String(json.text ?? json.transcript ?? "").trim();
}
