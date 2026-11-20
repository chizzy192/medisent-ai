/**
 * Speech configuration (owner decision, 2026-11-19: English only). One Spitch system voice,
 * read a little slower than natural for clarity; the browser's English voice is the offline
 * fallback and is labelled "Offline voice" in the UI.
 */
export const SPITCH_VOICE = "kingsley";
export const SPITCH_LANGUAGE = "en";
export const SPEECH_SPEED = 0.9;

/** Bumped whenever the voice or speed changes so old cached clips are never replayed. */
export const AUDIO_CACHE_VERSION = "v3-en";
