/**
 * Landing "live preview" console (BUILD_PLAN Stage 0, section 3): one prescription, scanned,
 * read out loud in plain English, and set as a reminder. The spoken sentence is demo content,
 * not UI text, so it lives here rather than in src/content.
 * Audio: a pre-generated clip at public/audio/landing/en.mp3 (Spitch "kingsley"). Until it
 * exists the console falls back to the browser's English voice, or says no voice is available.
 */
export const previewSentence = "Take one tablet every morning.";

/** The scanned label as printed (mono), and the scan result. Fictional demo data. */
export const previewLabel = {
  lines: ["AMLODIPINE 5MG TABS", "Sig: 1 tab o.d. × 30/7"],
  nafdac: "NAFDAC DEMO-A4-0001",
  confidence: 94,
  reminderHour: 8,
  taken: 2,
  total: 3,
  refillDays: 27,
};

export const previewAudioSrc = "/audio/landing/en.mp3";
