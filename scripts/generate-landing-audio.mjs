// Generates the landing-page preview clip with the Spitch "kingsley" voice (English, speed 0.9),
// the same sentence as src/config/landingPreview.ts. Reads SPITCH_API_KEY from .env.local.
// Run: node scripts/generate-landing-audio.mjs  →  public/audio/landing/en.mp3
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const SENTENCE = "Take one tablet every morning.";
const OUT = "public/audio/landing/en.mp3";

function envKey(name) {
  if (process.env[name]) return process.env[name];
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    const line = readFileSync(file, "utf8").split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
    if (line) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

const key = envKey("SPITCH_API_KEY");
if (!key) {
  console.error("SPITCH_API_KEY is not set (in the environment or .env.local).");
  process.exit(1);
}

const res = await fetch("https://api.spitch.app/v1/speech", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({ text: SENTENCE, language: "en", voice: "kingsley", format: "mp3", speed: 0.9 }),
});
if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("audio/")) {
  console.error(`Spitch answered ${res.status}: ${(await res.text()).slice(0, 300)}`);
  process.exit(1);
}
const bytes = Buffer.from(await res.arrayBuffer());
mkdirSync("public/audio/landing", { recursive: true });
writeFileSync(OUT, bytes);
console.log(`wrote ${OUT} (${bytes.length} bytes) for "${SENTENCE}"`);
