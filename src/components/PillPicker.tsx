"use client";

import { useTranslations } from "next-intl";
import { CheckIcon } from "./icons";
import { PillIcon, type PillShape } from "./PillIcon";

/**
 * "What does your medicine look like?" (signature element 3): six shapes drawn as the real
 * icon, eight common colours plus a free colour picker. Radios with visible labels, 48px targets.
 */
export const PILL_SHAPES: PillShape[] = ["round", "capsule", "oval", "inhaler", "liquid", "injection"];
export const PILL_COLOURS: { hex: string; key: string }[] = [
  { hex: "#FFFFFF", key: "white" },
  { hex: "#F2C94C", key: "yellow" },
  { hex: "#E05A5A", key: "red" },
  { hex: "#F2994A", key: "orange" },
  { hex: "#6FCF97", key: "green" },
  { hex: "#2F80ED", key: "blue" },
  { hex: "#F7A8C4", key: "pink" },
  { hex: "#8B5E3C", key: "brown" },
];

export function PillPicker({ shape, color, onShape, onColor }: { shape: PillShape; color: string; onShape: (s: PillShape) => void; onColor: (c: string) => void }) {
  const t = useTranslations("pill");
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="text-base font-medium">{t("shape")}</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PILL_SHAPES.map((s) => (
            <label
              key={s}
              className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-button border px-2 py-1.5 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${shape === s ? "border-2 border-primary bg-primary-tint" : "border-border bg-surface"}`}
            >
              <input type="radio" name="pillShape" value={s} checked={shape === s} onChange={() => onShape(s)} className="sr-only" />
              <PillIcon shape={s} color={color} size={36} />
              <span className="min-w-0 text-base font-medium [overflow-wrap:anywhere]">{t(`shapes.${s}`)}</span>
              {shape === s && <CheckIcon size={20} className="ml-auto shrink-0 text-primary" />}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-base font-medium">{t("colour")}</legend>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {PILL_COLOURS.map((c) => (
            <label key={c.hex} className="cursor-pointer rounded-button has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary" title={t(`colours.${c.key}`)}>
              <input type="radio" name="pillColorPreset" value={c.hex} checked={color.toUpperCase() === c.hex} onChange={() => onColor(c.hex)} className="sr-only" />
              <span
                className={`flex size-12 items-center justify-center rounded-button border-2 ${color.toUpperCase() === c.hex ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-surface" : "border-border"}`}
                style={{ backgroundColor: c.hex }}
              >
                {color.toUpperCase() === c.hex && <CheckIcon size={22} className="rounded-full bg-surface p-0.5 text-primary" />}
                <span className="sr-only">{t(`colours.${c.key}`)}</span>
              </span>
            </label>
          ))}
          <label className="flex min-h-12 items-center gap-2 rounded-button border border-border bg-surface px-2">
            <input type="color" value={color} onChange={(e) => onColor(e.target.value.toUpperCase())} aria-label={t("otherColour")} className="size-8 cursor-pointer rounded border-0 bg-transparent p-0" />
            <span className="font-mono text-sm">{color.toUpperCase()}</span>
          </label>
        </div>
      </fieldset>
    </div>
  );
}
