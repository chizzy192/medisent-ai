"use client";

import { tr } from "@/lib/strings";
import { DEMO_OTP, demoMode } from "@/lib/db/env";
import { Field, FormMessage, Input, describedBy } from "./forms";
import { StatusChip } from "./StatusChip";
import { SubmitButton } from "./SubmitButton";

/**
 * OTP step shared by signup and login: six-digit code sent to the phone on file. In demo mode
 * the fixed code is printed on screen with a "Demo" chip so nobody waits for an SMS.
 * One `formAction`; the submit buttons carry an `intent` (confirm / resend / restart).
 */
export function OtpStep({
  masked,
  delivery,
  error,
  triesLeft,
  cooldownSeconds,
  resent,
  formAction,
}: {
  masked: string;
  delivery: "demo" | "sms" | "logged";
  error?: string;
  triesLeft?: number;
  cooldownSeconds?: number;
  resent?: boolean;
  formAction: (formData: FormData) => void;
}) {
  const t = tr("otp");
  const exhausted = error === "too_many" || error === "expired" || error === "missing";
  const invalid = error === "codeWrong" || error === "codeFormat";

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {delivery !== "logged" && (
        <p className="text-base text-ink-2">
          {t("sentTo")} <span className="font-mono text-ink">{masked}</span>
        </p>
      )}
      {resent && <FormMessage tone="success">{t("resent")}</FormMessage>}
      {cooldownSeconds !== undefined && cooldownSeconds > 0 && <FormMessage tone="info">{t("cooldown", { seconds: cooldownSeconds })}</FormMessage>}
      {demoMode && delivery === "demo" && (
        <FormMessage tone="info">
          <span className="flex flex-wrap items-center gap-2">
            <StatusChip tone="primary">{t("demoChip")}</StatusChip>
            <span>
              {t("demoCode")} <span className="font-mono text-lg font-medium">{DEMO_OTP}</span>
            </span>
          </span>
        </FormMessage>
      )}
      {delivery === "logged" && <FormMessage tone="info">{t("notSent")}</FormMessage>}
      {error && !invalid && <FormMessage tone="error">{t(`errors.${error}`)}</FormMessage>}
      {error === "codeWrong" && triesLeft !== undefined && <p className="text-base text-ink-2">{t("triesLeft", { count: triesLeft })}</p>}
      <Field label={t("codeLabel")} htmlFor="code" hint={t("codeHint")} error={invalid ? t(`errors.${error}`) : undefined}>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={8}
          autoFocus
          disabled={exhausted}
          invalid={invalid}
          aria-describedby={describedBy("code", { hint: true, error: invalid })}
          className="font-mono text-time tracking-[0.3em]"
        />
      </Field>
      <div className="flex flex-col gap-3 sm:flex-row">
        {!exhausted && (
          <SubmitButton name="intent" value="confirm" pendingLabel={t("checking")}>
            {t("confirm")}
          </SubmitButton>
        )}
        <SubmitButton name="intent" value="resend" variant="outline" formNoValidate pendingLabel={t("sending")}>
          {t("resend")}
        </SubmitButton>
        <SubmitButton name="intent" value="restart" variant="outline" formNoValidate pendingLabel={t("startOver")}>
          {t("startOver")}
        </SubmitButton>
      </div>
    </form>
  );
}
