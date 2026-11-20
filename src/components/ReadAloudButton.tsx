"use client";

import { tr } from "@/lib/strings";
import { useVoice } from "@/lib/speech/useVoice";
import { SpeakerIcon, StopIcon } from "./icons";

const showSourceBadge = process.env.NODE_ENV !== "production";

/**
 * Reads the current screen's <main> aloud through the shared player (BUILD_PLAN rule: every
 * screen has one). The page text is English, so it goes to /api/speak as is.
 */
export function ReadAloudButton({ targetId = "main" }: { targetId?: string }) {
  const t = tr("header");
  const tv = tr("voice");
  const { speak, stop, speaking, message, source } = useVoice();

  function toggle() {
    if (speaking) return stop();
    const root = document.getElementById(targetId);
    if (!root) return;
    const text = speakableText(root).replace(/\s+/g, " ").trim().slice(0, 400);
    if (text) void speak(text);
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={speaking}
          className="flex h-12 min-w-12 items-center justify-center gap-2 rounded-button border border-border bg-surface px-3 text-sm font-medium whitespace-nowrap text-ink-2 hover:bg-surface-2"
        >
          {speaking ? <StopIcon size={20} className="text-primary" /> : <SpeakerIcon size={20} className="text-primary" />}
          <span>{speaking ? t("stopReading") : t("readAloud")}</span>
        </button>
        {source === "browser" && <span className="rounded-full bg-warning-tint px-2 py-0.5 font-mono text-label text-warning uppercase">{tv("offlineVoice")}</span>}
        {showSourceBadge && source && (
          <span data-testid="voice-source" className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-label text-ink-2 uppercase" title="Dev only: audio source">
            {source}
          </span>
        )}
      </div>
      <p
        role="status"
        className="absolute top-full right-0 z-10 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-card border border-border bg-surface p-3 text-base text-ink empty:invisible"
      >
        {message}
      </p>
    </div>
  );
}

/**
 * Text as a screen reader would hear it: skips aria-hidden and hidden nodes, uses aria-label
 * where one is given (e.g. the Today ring says "2 of 3 doses taken" instead of "2/3").
 */
function speakableText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (!(node instanceof HTMLElement || node instanceof SVGElement)) return "";
  if (node.getAttribute("aria-hidden") === "true" || node.hasAttribute("hidden")) return "";
  if (node instanceof HTMLElement && node.offsetParent === null && getComputedStyle(node).position !== "fixed") return "";
  const label = node.getAttribute("aria-label");
  if (label) return ` ${label} `;
  const block = node instanceof HTMLElement && /^(P|DIV|LI|H[1-6]|SECTION|ARTICLE|TR|TD|TH|DT|DD|BUTTON)$/.test(node.tagName);
  const inner = Array.from(node.childNodes).map(speakableText).join("");
  return block ? ` ${inner}. ` : inner;
}
