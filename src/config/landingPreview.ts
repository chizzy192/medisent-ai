import type { Locale } from "./locales";

/**
 * Landing "live preview" console (BUILD_PLAN Stage 0, section 3): one prescription spoken
 * in five languages. The spoken sentence is content in that language, not UI text, so it
 * lives here rather than in messages/. Native speakers must check every sentence.
 * Audio: pre-generated files at public/audio/landing/<code>.mp3 (Spitch / 9jaLingo). Until
 * they exist the console falls back to the browser voice, or says the voice is missing.
 */
export const previewSentence: Record<Locale, string> = {
  en: "Take one tablet every morning.",
  ig: "Ṅụọ otu mkpụrụ ọgwụ n'ụtụtụ ọ bụla.",
  yo: "Lo kóró oògùn kan ní àárọ̀ ọjọ́ kọ̀ọ̀kan.",
  ha: "Sha ƙwaya ɗaya kowace safiya.",
  pcm: "Take one tablet every morning time.",
};

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

export const previewAudioSrc = (code: Locale) => `/audio/landing/${code}.mp3`;
