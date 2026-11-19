"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { reviewHospital, type ReviewState } from "@/app/(platform)/actions";
import { FormMessage, Textarea, describedBy } from "@/components/forms";
import { SubmitButton } from "@/components/SubmitButton";

/**
 * Platform admin decision on one hospital. A rejection needs a note (it is sent to the
 * hospital); a reviewed hospital can be reopened, which undoes a mis-tap.
 */
export function ReviewForm({ hospitalId, mode, note }: { hospitalId: string; mode: "review" | "reviewed"; note: string | null }) {
  const t = useTranslations("approveHospitals");
  const [state, formAction] = useActionState(reviewHospital, undefined as ReviewState);
  const noteId = `note-${hospitalId}`;

  if (mode === "reviewed") {
    return (
      <form action={formAction} className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-2 pt-3">
        <input type="hidden" name="id" value={hospitalId} />
        <p className="min-w-0 flex-[1_1_16rem] text-sm text-ink-2 [overflow-wrap:anywhere]">
          {note ? `${t("noteLabel")}: ${note}` : t("noNote")}
        </p>
        <SubmitButton name="decision" value="reopen" variant="outline" pendingLabel={t("saving")} className="min-h-12 px-3 text-sm">
          {t("reopen")}
        </SubmitButton>
      </form>
    );
  }

  const error = state?.error;
  return (
    <form action={formAction} className="space-y-3 border-t border-surface-2 pt-4">
      <input type="hidden" name="id" value={hospitalId} />
      {error && <FormMessage tone="error">{t(`errors.${error}`)}</FormMessage>}
      <label htmlFor={noteId} className="block text-base font-medium">
        {t("note")}
      </label>
      <p id={`${noteId}-hint`} className="text-sm text-ink-2">
        {t("noteHint")}
      </p>
      <Textarea id={noteId} name="note" rows={2} maxLength={500} invalid={error === "noteRequired"} aria-describedby={describedBy(noteId, { hint: true })} />
      <div className="flex flex-wrap gap-3">
        <SubmitButton name="decision" value="approved" pendingLabel={t("saving")}>
          {t("approve")}
        </SubmitButton>
        <SubmitButton name="decision" value="rejected" variant="outline" pendingLabel={t("saving")}>
          {t("reject")}
        </SubmitButton>
      </div>
    </form>
  );
}
