"use client";

import { useState, useTransition } from "react";
import { tr } from "@/lib/strings";
import { stopCourseEarly } from "@/app/(patient)/meds/actions";
import type { CourseProgress } from "@/lib/course";
import { AlertIcon, CheckIcon } from "@/components/icons";
import { ListenButton } from "@/components/ListenButton";
import { StatusChip } from "@/components/StatusChip";
import { Meter } from "@/components/ui";

/**
 * Finish-your-course card: "Day 3 of 5 · 6 doses left", a progress bar, and the one sentence
 * that matters ("Don't stop early, even if you feel better."), read aloud. Amber when two or
 * more doses were missed. On the medicines page the patient can say they stopped early, which
 * alerts the doctor.
 */
export function CourseCard({ course, rate = 1, allowStop = false }: { course: CourseProgress; rate?: number; allowStop?: boolean }) {
  const t = tr("course");
  const [pending, start] = useTransition();
  const [stopped, setStopped] = useState(course.stoppedEarly);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const progress = t("progress", { day: course.day, total: course.durationDays, left: course.left });
  const spoken = `${course.drugName}. ${progress}. ${t("dontStop")}`;
  const tone = stopped ? "neutral" : course.atRisk ? "warning" : "success";

  return (
    <article className={`rounded-card border-2 bg-surface p-4 ${course.atRisk && !stopped ? "border-warning-dot" : "border-border"}`} data-testid="course-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="label-mono">{t("label")}</p>
          <h3 className="text-card-title font-semibold [overflow-wrap:anywhere]">
            {course.drugName} <span className="font-mono text-base font-medium text-ink-2">{course.strength}</span>
          </h3>
        </div>
        <StatusChip tone={tone}>{stopped ? t("stopped") : course.atRisk ? t("atRisk") : t("onTrack")}</StatusChip>
      </div>
      <p className="mt-2 font-mono text-time font-medium text-ink">{progress}</p>
      <div className="mt-2">
        <Meter label={t("meterLabel")} valueText={t("takenOf", { taken: course.taken, total: course.totalDoses })} value={course.taken} max={course.totalDoses} tone={course.atRisk ? "warning" : "primary"} />
      </div>
      {course.atRisk && !stopped && (
        <p className="mt-3 flex items-start gap-2 text-base font-medium text-warning">
          <AlertIcon size={20} className="mt-0.5 shrink-0" />
          {t("missedNote", { count: course.missed })}
        </p>
      )}
      <p className="mt-3 text-lg">{t("dontStop")}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <ListenButton text={spoken} rate={rate} />
      </div>
      {allowStop && !stopped && !course.finished && (
        <div className="mt-3 border-t border-surface-2 pt-3">
          {confirm ? (
            <div className="space-y-2">
              <p className="text-base text-ink-2">{t("stopConfirm")}</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await stopCourseEarly(course.prescriptionId).catch(() => ({ ok: false }));
                      if (!res.ok) return setError(t("notSaved"));
                      setStopped(true);
                    })
                  }
                  className="btn-outline"
                >
                  <CheckIcon size={18} /> {t("stopYes")}
                </button>
                <button type="button" onClick={() => setConfirm(false)} className="btn-outline">
                  {t("stopNo")}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} className="text-base font-medium text-primary underline">
              {t("stopButton")}
            </button>
          )}
          {error && (
            <p role="alert" className="mt-2 text-base font-medium text-danger">
              {error}
            </p>
          )}
        </div>
      )}
      {stopped && <p className="mt-3 text-base text-ink-2">{t("stoppedNote")}</p>}
    </article>
  );
}
