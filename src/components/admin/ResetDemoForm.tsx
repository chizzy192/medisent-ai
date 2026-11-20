"use client";

import { useActionState, useState } from "react";
import { tr } from "@/lib/strings";
import { resetDemo, type ResetState } from "@/app/(platform)/actions";
import { FormMessage } from "@/components/forms";
import { SubmitButton } from "@/components/SubmitButton";
import { Card } from "@/components/ui";

/** Platform admin, demo mode only: put every demo account, medicine and log back to the seed. */
export function ResetDemoForm() {
  const t = tr("resetDemo");
  const [state, formAction] = useActionState(resetDemo, undefined as ResetState);
  const [armed, setArmed] = useState(false);
  return (
    <Card as="section" className="space-y-3" testId="reset-demo">
      <h2 className="text-xl">{t("title")}</h2>
      <p className="text-base text-ink-2">{t("body")}</p>
      {state?.ok && <FormMessage tone="success">{t("done", { seconds: Math.round(state.ms / 1000) })}</FormMessage>}
      {state && !state.ok && (
        <FormMessage tone="error">
          <p>{t("failed")}</p>
          <p className="mt-1 font-mono text-sm">{state.error}</p>
        </FormMessage>
      )}
      {armed ? (
        <form action={formAction} className="flex flex-col gap-3 sm:flex-row">
          <SubmitButton pendingLabel={t("working")}>{t("confirm")}</SubmitButton>
          <button type="button" onClick={() => setArmed(false)} className="btn-outline">
            {t("cancel")}
          </button>
        </form>
      ) : (
        <button type="button" onClick={() => setArmed(true)} className="btn-outline">
          {t("button")}
        </button>
      )}
    </Card>
  );
}
