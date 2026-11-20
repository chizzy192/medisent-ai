"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { tr } from "@/lib/strings";
import { loginAction, type LoginState } from "@/app/(public)/login/actions";
import { Field, FormMessage, Input, describedBy } from "@/components/forms";
import { useFocusInvalid } from "@/components/useFocusInvalid";
import { OtpStep } from "@/components/OtpStep";
import { SubmitButton } from "@/components/SubmitButton";
import { EmptyState } from "@/components/EmptyState";
import { ButtonLink } from "@/components/ui";
import { DEMO_OTP, demoMode } from "@/lib/db/env";

/** Login: phone or email → OTP to the phone on file → the role's home. */
export function LoginForm({ next, reason }: { next: string; reason?: string }) {
  const t = tr("login");
  const [state, formAction] = useActionState(loginAction, { step: "form" } as LoginState);
  const formRef = useRef<HTMLFormElement>(null);
  const fieldError = state.step === "form" && (state.error === "identifierInvalid" || state.error === "identifierRequired") ? state.error : undefined;
  useFocusInvalid(formRef, fieldError ?? "");

  if (state.step === "otp") {
    return <OtpStep masked={state.masked} delivery={state.delivery} error={state.error} triesLeft={state.triesLeft} cooldownSeconds={state.cooldownSeconds} resent={state.resent} formAction={formAction} />;
  }

  if (state.step === "status") {
    return (
      <EmptyState label={t(`status.${state.status}.label`)} title={t(`status.${state.status}.title`)} action={<ButtonLink href="/" variant="outline">{t("backHome")}</ButtonLink>}>
        <p>{t(`status.${state.status}.body`)}</p>
      </EmptyState>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      {reason === "unverified" && <FormMessage tone="info">{t("unverified")}</FormMessage>}
      {demoMode && (
        <div className="rounded-button border border-border bg-bg p-3 text-base" data-testid="demo-hints">
          <p className="font-semibold">{t("demo.title")}</p>
          <ul className="mt-1 space-y-0.5 text-ink-2">
            {(["patient", "pharmacist", "doctor", "hospitalAdmin", "platformAdmin"] as const).map((k) => (
              <li key={k}>
                {t(`demo.${k}`)} <span className="font-mono text-ink">{t(`demo.${k}Phone`)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-ink-2">
            {t("demo.code")} <span className="font-mono text-ink">{DEMO_OTP}</span>
          </p>
        </div>
      )}
      {state.error && !fieldError && <FormMessage tone="error">{t(`errors.${state.error}`)}</FormMessage>}
      <Field label={t("identifier")} htmlFor="identifier" hint={t("identifierHint")} error={fieldError ? t(`errors.${fieldError}`) : undefined}>
        <Input
          id="identifier"
          name="identifier"
          inputMode="text"
          autoComplete="username"
          placeholder="0803 000 0000"
          defaultValue={state.identifier}
          invalid={Boolean(fieldError)}
          aria-describedby={describedBy("identifier", { hint: true, error: Boolean(fieldError) })}
          autoFocus
        />
      </Field>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SubmitButton name="intent" value="start" pendingLabel={t("sending")}>
          {t("sendCode")}
        </SubmitButton>
        <Link href="/signup" className="btn-outline">
          {t("noAccount")}
        </Link>
      </div>
    </form>
  );
}
