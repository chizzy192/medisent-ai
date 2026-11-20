"use client";

import { useEffect, useId, useRef, useState } from "react";
import { tr } from "@/lib/strings";

/**
 * One photo: the phone camera (capture="environment") or the gallery, with a preview and
 * "Retake". Native file input, so it works on every Android browser without getUserMedia.
 */
export function PhotoInput({
  label,
  hint,
  required,
  file,
  onChange,
  testId,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  file: File | null;
  onChange: (f: File | null) => void;
  testId?: string;
}) {
  const t = tr("photo");
  const id = useId();
  const [preview, setPreview] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  // The preview URL is made where the file is picked (not in an effect) and released on unmount.
  function pick(next: File | null) {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = next ? URL.createObjectURL(next) : null;
    setPreview(urlRef.current);
    onChange(next);
  }
  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <p className="text-base font-medium">
        {label} {required ? <span className="text-ink-2">({t("required")})</span> : <span className="text-ink-2">({t("optional")})</span>}
      </p>
      {hint && <p className="mt-0.5 text-sm text-ink-2">{hint}</p>}
      {preview && file ? (
        <div className="mt-3 space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
          <img src={preview} alt="" className="max-h-64 w-full rounded-button object-contain bg-bg" />
          <button type="button" onClick={() => pick(null)} className="btn-outline w-full sm:w-auto">
            {t("retake")}
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <label className="btn-primary flex-1 cursor-pointer">
            {t("takePhoto")}
            <input id={`${id}-cam`} type="file" accept="image/*" capture="environment" className="sr-only" data-testid={testId} onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          </label>
          <label className="btn-outline flex-1 cursor-pointer">
            {t("choose")}
            <input id={`${id}-file`} type="file" accept="image/*" className="sr-only" data-testid={testId ? `${testId}-file` : undefined} onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          </label>
        </div>
      )}
    </div>
  );
}
