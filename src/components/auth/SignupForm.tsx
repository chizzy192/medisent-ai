"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { localeNames, locales } from "@/config/locales";
import { licenceBodies, NO_HOSPITAL, signupRoles, type Role } from "@/lib/db/types";
import { signupAction, type SignupState } from "@/app/(public)/signup/actions";
import { CheckboxField, Field, FormMessage, Input, Select, describedBy } from "@/components/forms";
import { useFocusInvalid } from "@/components/useFocusInvalid";
import { OtpStep } from "@/components/OtpStep";
import { SubmitButton } from "@/components/SubmitButton";
import { EmptyState } from "@/components/EmptyState";
import { ButtonLink } from "@/components/ui";

type HospitalOption = { id: string; name: string };

/**
 * Signup (BUILD_PLAN Stage 1): hospital → role → role fields → OTP. Fields show and hide with
 * the chosen role; one server action validates everything again and drives every step.
 */
export function SignupForm({ hospitals }: { hospitals: HospitalOption[] }) {
  const t = useTranslations("signup");
  const locale = useLocale();
  const [state, formAction] = useActionState(signupAction, { step: "form" } as SignupState);
  const values = state.step === "form" ? (state.values ?? {}) : {};
  const [hospital, setHospital] = useState(values.hospital ?? "");
  const [role, setRole] = useState<Role | "">((values.role as Role) ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  useFocusInvalid(formRef, Object.keys(state.step === "form" ? (state.fieldErrors ?? {}) : {}).join(","));

  if (state.step === "otp") {
    return <OtpStep masked={state.masked} delivery={state.delivery} error={state.error} triesLeft={state.triesLeft} cooldownSeconds={state.cooldownSeconds} resent={state.resent} formAction={formAction} />;
  }

  if (state.step === "rejected") {
    return (
      <EmptyState
        label={t("rejected.label")}
        title={t("rejected.title")}
        action={
          <form action={formAction} className="flex flex-wrap gap-3">
            <SubmitButton name="intent" value="restart" pendingLabel={t("rejected.tryAgain")}>
              {t("rejected.tryAgain")}
            </SubmitButton>
            <ButtonLink href="/" variant="outline">
              {t("backHome")}
            </ButtonLink>
          </form>
        }
      >
        <p>{t("rejected.body")}</p>
        <p className="mt-2 text-base">{t("rejected.attempts", { count: Math.max(0, 3 - state.failedAttempts) })}</p>
      </EmptyState>
    );
  }

  if (state.step === "blocked") {
    return (
      <EmptyState label={t("blocked.label")} title={t("blocked.title")} action={<ButtonLink href="/" variant="outline">{t("backHome")}</ButtonLink>}>
        <p>{t("blocked.body")}</p>
      </EmptyState>
    );
  }

  if (state.step === "exists") {
    return (
      <EmptyState label={t("exists.label")} title={t("exists.title")} action={<ButtonLink href="/login">{t("exists.login")}</ButtonLink>}>
        <p>{t("exists.body")}</p>
      </EmptyState>
    );
  }

  const errors = state.fieldErrors ?? {};
  const err = (name: string) => (errors[name] ? t(`errors.${errors[name]}`) : undefined);
  const isStaff = role !== "" && role !== "patient";
  const independent = hospital === NO_HOSPITAL;
  const needsLicence = isStaff && role !== "hospital_admin";

  return (
    <form ref={formRef} action={formAction} className="space-y-5" noValidate>
      {state.error && <FormMessage tone="error">{t(`errors.${state.error}`)}</FormMessage>}

      <Field label={t("hospital")} htmlFor="hospital" error={err("hospital")} hint={t("hospitalHint")}>
        <Select
          id="hospital"
          name="hospital"
          value={hospital}
          onChange={(e) => {
            setHospital(e.target.value);
            // Independent patients have one role; staff fields must not linger.
            if (e.target.value === NO_HOSPITAL) setRole("patient");
          }}
          invalid={Boolean(err("hospital"))}
          aria-describedby={describedBy("hospital", { hint: true, error: Boolean(err("hospital")) })}
        >
          <option value="">{t("choose")}</option>
          <option value={NO_HOSPITAL}>{t("noHospital")}</option>
          {hospitals.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={t("role")} htmlFor="role" error={err("role")}>
        <Select id="role" name="role" value={role} onChange={(e) => setRole(e.target.value as Role)} invalid={Boolean(err("role"))} aria-describedby={describedBy("role", { error: Boolean(err("role")) })}>
          <option value="">{t("choose")}</option>
          {signupRoles
            .filter((r) => !independent || r === "patient")
            .map((r) => (
              <option key={r} value={r}>
                {t(`roles.${r}`)}
              </option>
            ))}
        </Select>
      </Field>

      {(isStaff || independent) && (
        <Field label={t("fullName")} htmlFor="fullName" error={err("fullName")} hint={isStaff ? t("fullNameHint") : undefined}>
          <Input id="fullName" name="fullName" autoComplete="name" defaultValue={values.fullName} invalid={Boolean(err("fullName"))} aria-describedby={describedBy("fullName", { hint: isStaff, error: Boolean(err("fullName")) })} />
        </Field>
      )}

      {isStaff && (
        <Field label={t("staffId")} htmlFor="staffId" error={err("staffId")} hint={t("staffIdHint")}>
          <Input id="staffId" name="staffId" autoCapitalize="characters" defaultValue={values.staffId} invalid={Boolean(err("staffId"))} aria-describedby={describedBy("staffId", { hint: true, error: Boolean(err("staffId")) })} className="font-mono" />
        </Field>
      )}

      {needsLicence && (
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Field label={t("licenceBody")} htmlFor="licenceBody" error={err("licenceBody")} hint={t("licenceBodyHint")}>
            <Select id="licenceBody" name="licenceBody" defaultValue={values.licenceBody ?? ""} invalid={Boolean(err("licenceBody"))} aria-describedby={describedBy("licenceBody", { hint: true, error: Boolean(err("licenceBody")) })}>
              <option value="">{t("choose")}</option>
              {licenceBodies.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("licenceNo")} htmlFor="licenceNo" error={err("licenceNo")} hint={t("licenceNoHint")}>
            <Input id="licenceNo" name="licenceNo" defaultValue={values.licenceNo} invalid={Boolean(err("licenceNo"))} aria-describedby={describedBy("licenceNo", { hint: true, error: Boolean(err("licenceNo")) })} className="font-mono" />
          </Field>
        </div>
      )}

      {role === "patient" && !independent && (
        <Field label={t("hospitalNumber")} htmlFor="hospitalNumber" error={err("hospitalNumber")} hint={t("hospitalNumberHint")}>
          <Input id="hospitalNumber" name="hospitalNumber" autoCapitalize="characters" defaultValue={values.hospitalNumber} invalid={Boolean(err("hospitalNumber"))} aria-describedby={describedBy("hospitalNumber", { hint: true, error: Boolean(err("hospitalNumber")) })} className="font-mono" />
        </Field>
      )}

      {role === "patient" && (
        <Field label={t("phone")} htmlFor="phone" error={err("phone")} hint={independent ? t("phoneHintIndependent") : t("phoneHint")}>
          <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 000 0000" defaultValue={values.phone} invalid={Boolean(err("phone"))} aria-describedby={describedBy("phone", { hint: true, error: Boolean(err("phone")) })} className="font-mono" />
        </Field>
      )}

      <Field label={t("language")} htmlFor="language" hint={t("languageHint")}>
        <Select id="language" name="language" defaultValue={values.language ?? locale} aria-describedby={describedBy("language", { hint: true })}>
          {locales.map((code) => (
            <option key={code} value={code} lang={code}>
              {localeNames[code]}
            </option>
          ))}
        </Select>
      </Field>

      <CheckboxField id="consent" name="consent" label={t("consent")} error={err("consent")} defaultChecked={values.consent === "on"} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SubmitButton name="intent" value="start" pendingLabel={t("checking")}>
          {t("continue")}
        </SubmitButton>
        <Link href="/login" className="btn-outline">
          {t("haveAccount")}
        </Link>
      </div>
    </form>
  );
}
