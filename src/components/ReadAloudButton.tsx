"use client";

import { useTranslations } from "next-intl";
import { useSpeech } from "@/lib/speech";
import { SpeakerIcon, StopIcon } from "./icons";

/**
 * Reads the current screen's <main> aloud. Every screen has one (BUILD_PLAN rule).
 * Stage 2 switches the voice source to /api/speak.
 */
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

export function ReadAloudButton({ targetId = "main" }: { targetId?: string }) {
  const t = useTranslations("header");
  const { speaking, message, speak, stop } = useSpeech();

  function toggle() {
    if (speaking) return stop();
    const root = document.getElementById(targetId);
    if (!root) return;
    const text = speakableText(root).replace(/\s+/g, " ").trim();
    if (text) speak(text);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        className="flex h-12 min-w-12 items-center justify-center gap-2 rounded-button border border-border bg-surface px-3 text-sm font-medium whitespace-nowrap text-ink-2 hover:bg-surface-2"
      >
        {speaking ? <StopIcon size={20} className="text-primary" /> : <SpeakerIcon size={20} className="text-primary" />}
        <span>{speaking ? t("stopReading") : t("readAloud")}</span>
      </button>
      <p
        role="status"
        className="absolute top-full right-0 z-10 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-card border border-border bg-surface p-3 text-base text-ink empty:invisible"
      >
        {message}
      </p>
    </div>
  );
}
