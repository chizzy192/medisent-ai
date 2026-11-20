"use client";

import { useActionState, useRef, useState } from "react";
import { tr } from "@/lib/strings";
import { registerHospital, type RegisterState } from "@/app/(public)/register-hospital/actions";
import { Field, FormMessage, Input, Select, Textarea, describedBy } from "@/components/forms";
import { SubmitButton } from "@/components/SubmitButton";
import { EmptyState } from "@/components/EmptyState";
import { Logo } from "@/components/Logo";
import { ButtonLink, Card, SectionLabel } from "@/components/ui";
import { useFocusInvalid } from "@/components/useFocusInvalid";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];
const MAX_LOGO = 2 * 1024 * 1024;
const MAX_LICENCE = 10 * 1024 * 1024;
const fileClass = "py-2.5 file:mr-3 file:rounded-button file:border-0 file:bg-primary-tint file:px-3 file:py-1.5 file:font-medium file:text-primary";

function sizeLabel(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

/**
 * Hospital registration (BUILD_PLAN Stage 1), in four cards: hospital, verification (CAC +
 * licence), hospital admin, then appearance (optional, collapsed). Files are checked for size
 * before the upload and kept after a server-side error; errors are summarised at the top and
 * focus moves to the first invalid field.
 */
export function RegisterHospitalForm() {
  const t = tr("registerHospital");
  const [state, formAction] = useActionState(registerHospital, { step: "form" } as RegisterState);
  const values = state.step === "form" ? (state.values ?? {}) : {};
  const [colour, setColour] = useState(values.brandColor ?? "#1D4E89");
  const [name, setName] = useState(values.name ?? "");
  const [files, setFiles] = useState<{ logo?: File; licence?: File }>({});
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const errors = { ...(state.step === "form" ? (state.fieldErrors ?? {}) : {}), ...clientErrors };
  const errorKeys = Object.keys(errors);

  useFocusInvalid(formRef, errorKeys.join(","));


  if (state.step === "done") {
    return (
      <EmptyState label={t("done.label")} title={t("done.title")} action={<ButtonLink href="/">{t("done.home")}</ButtonLink>}>
        <p>{t("done.body", { hospital: state.hospitalName })}</p>
        <p className="mt-2">
          {t("done.staffId")} <span className="font-mono text-ink">{state.staffId}</span>
        </p>
      </EmptyState>
    );
  }

  const err = (k: string) => (errors[k] ? t(`errors.${errors[k]}`) : undefined);
  const labels: Record<string, string> = {
    name: t("name"), city: t("city"), state: t("state"), cacNo: t("cacNo"), licence: t("licence"), logo: t("logo"),
    brandColor: t("brandColor"), contactName: t("contactName"), staffId: t("staffId"), contactPhone: t("contactPhone"), contactEmail: t("contactEmail"),
  };

  function pickFile(kind: "logo" | "licence", file: File | undefined) {
    setFiles((f) => ({ ...f, [kind]: file }));
    if (kind === "logo") {
      setLogoUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return file ? URL.createObjectURL(file) : null;
      });
    }
    setClientErrors((e) => {
      const next = { ...e };
      delete next[kind];
      if (file && file.size > (kind === "logo" ? MAX_LOGO : MAX_LICENCE)) next[kind] = kind === "logo" ? "logoTooBig" : "licenceTooBig";
      return next;
    });
  }

  // Re-attach files kept in state when the native inputs were reset by a failed round-trip.
  function submit(formData: FormData) {
    const problems: Record<string, string> = {};
    const logo = formData.get("logo");
    const licence = formData.get("licence");
    if (!(logo instanceof File) || logo.size === 0) {
      if (files.logo) formData.set("logo", files.logo);
      else formData.delete("logo");
    }
    if (!(licence instanceof File) || licence.size === 0) {
      if (files.licence) formData.set("licence", files.licence);
      else problems.licence = "licenceRequired";
    }
    const finalLogo = formData.get("logo");
    const finalLicence = formData.get("licence");
    if (finalLogo instanceof File && finalLogo.size > MAX_LOGO) problems.logo = "logoTooBig";
    if (finalLicence instanceof File && finalLicence.size > MAX_LICENCE) problems.licence = "licenceTooBig";
    setClientErrors(problems);
    if (Object.keys(problems).length) return;
    formAction(formData);
  }

  return (
    <form ref={formRef} action={submit} className="space-y-6" encType="multipart/form-data" noValidate>
      {state.step === "form" && state.error && <FormMessage tone="error">{t(`errors.${state.error}`)}</FormMessage>}
      {errorKeys.length > 0 && (
        <FormMessage tone="error">
          <p className="font-semibold">{t("errorSummary", { count: errorKeys.length })}</p>
          <ul className="mt-1 list-inside list-disc">
            {errorKeys.map((k) => (
              <li key={k}>
                <a href={`#${k}`} className="underline">
                  {labels[k] ?? k}
                </a>
                : {err(k)}
              </li>
            ))}
          </ul>
        </FormMessage>
      )}

      <Card as="section" className="space-y-5">
        <SectionLabel as="h2">{t("sectionHospital")}</SectionLabel>
        <Field label={t("name")} htmlFor="name" error={err("name")}>
          <Input id="name" name="name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} invalid={Boolean(err("name"))} aria-describedby={describedBy("name", { error: Boolean(err("name")) })} required />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("city")} htmlFor="city" error={err("city")}>
            <Input id="city" name="city" defaultValue={values.city} invalid={Boolean(err("city"))} aria-describedby={describedBy("city", { error: Boolean(err("city")) })} required />
          </Field>
          <Field label={t("state")} htmlFor="state" error={err("state")}>
            <Select id="state" name="state" defaultValue={values.state ?? ""} invalid={Boolean(err("state"))} aria-describedby={describedBy("state", { error: Boolean(err("state")) })} required>
              <option value="">{t("chooseState")}</option>
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={t("address")} htmlFor="address">
          <Textarea id="address" name="address" rows={2} defaultValue={values.address} />
        </Field>
      </Card>

      <Card as="section" className="space-y-5">
        <SectionLabel as="h2">{t("sectionVerification")}</SectionLabel>
        <p className="text-base text-ink-2">{t("verificationIntro")}</p>
        <Field label={t("cacNo")} htmlFor="cacNo" error={err("cacNo")} hint={t("cacHint")}>
          <Input id="cacNo" name="cacNo" defaultValue={values.cacNo} maxLength={30} invalid={Boolean(err("cacNo"))} aria-describedby={describedBy("cacNo", { hint: true, error: Boolean(err("cacNo")) })} className="font-mono" required />
        </Field>
        <Field label={t("licence")} htmlFor="licence" error={err("licence")} hint={t("licenceHint")}>
          <Input id="licence" name="licence" type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e) => pickFile("licence", e.target.files?.[0])} invalid={Boolean(err("licence"))} aria-describedby={describedBy("licence", { hint: true, error: Boolean(err("licence")) })} className={fileClass} />
          {files.licence && !errors.licence && (
            <p className="mt-1.5 text-sm text-ink-2 [overflow-wrap:anywhere]">
              {t("attached", { name: files.licence.name, size: sizeLabel(files.licence.size) })}
            </p>
          )}
        </Field>
      </Card>

      <Card as="section" className="space-y-5">
        <SectionLabel as="h2">{t("sectionAdmin")}</SectionLabel>
        <p className="text-base text-ink-2">{t("adminIntro")}</p>
        <Field label={t("contactName")} htmlFor="contactName" error={err("contactName")}>
          <Input id="contactName" name="contactName" autoComplete="off" defaultValue={values.contactName} invalid={Boolean(err("contactName"))} aria-describedby={describedBy("contactName", { error: Boolean(err("contactName")) })} required />
        </Field>
        <Field label={t("staffId")} htmlFor="staffId" error={err("staffId")} hint={t("staffIdHint")}>
          <Input id="staffId" name="staffId" autoComplete="off" defaultValue={values.staffId} maxLength={30} invalid={Boolean(err("staffId"))} aria-describedby={describedBy("staffId", { hint: true, error: Boolean(err("staffId")) })} className="font-mono" required />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("contactPhone")} htmlFor="contactPhone" error={err("contactPhone")}>
            <Input id="contactPhone" name="contactPhone" type="tel" inputMode="tel" autoComplete="off" placeholder="0803 000 0000" defaultValue={values.contactPhone} invalid={Boolean(err("contactPhone"))} aria-describedby={describedBy("contactPhone", { error: Boolean(err("contactPhone")) })} className="font-mono" required />
          </Field>
          <Field label={t("contactEmail")} htmlFor="contactEmail" error={err("contactEmail")}>
            <Input id="contactEmail" name="contactEmail" type="email" autoComplete="off" defaultValue={values.contactEmail} invalid={Boolean(err("contactEmail"))} aria-describedby={describedBy("contactEmail", { error: Boolean(err("contactEmail")) })} required />
          </Field>
        </div>
      </Card>

      <details className="group rounded-card border border-border bg-surface" open={Boolean(files.logo || errors.logo || (values.brandColor && values.brandColor !== "#1D4E89"))}>
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 p-4 text-lg font-semibold">
          <span>{t("sectionAppearance")}</span>
          <span aria-hidden="true" className="font-mono text-sm text-ink-3 group-open:hidden">+</span>
          <span aria-hidden="true" className="hidden font-mono text-sm text-ink-3 group-open:inline">−</span>
        </summary>
        <div className="space-y-5 border-t border-surface-2 p-4">
          <p className="text-base text-ink-2">{t("appearanceIntro")}</p>
          <Field label={t("brandColor")} htmlFor="brandColor" error={err("brandColor")} hint={t("brandColorHint")}>
            <div className="flex items-center gap-3">
              <input id="brandColor" name="brandColor" type="color" value={colour} onChange={(e) => setColour(e.target.value.toUpperCase())} className="size-12 cursor-pointer rounded-button border border-border bg-surface p-1" />
              <span className="font-mono text-base">{colour}</span>
            </div>
          </Field>
          <Field label={t("logo")} htmlFor="logo" error={err("logo")} hint={t("logoHint")}>
            <Input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={(e) => pickFile("logo", e.target.files?.[0])} invalid={Boolean(err("logo"))} aria-describedby={describedBy("logo", { hint: true, error: Boolean(err("logo")) })} className={fileClass} />
            {files.logo && !errors.logo && (
              <p className="mt-1.5 text-sm text-ink-2 [overflow-wrap:anywhere]">{t("attached", { name: files.logo.name, size: sizeLabel(files.logo.size) })}</p>
            )}
          </Field>
          {/* Live preview of the header rule: white, logo, hospital name with its logo, 3px brand bar. */}
          <div>
            <p className="label-mono mb-2">{t("preview")}</p>
            <div aria-hidden="true" className="min-w-0 overflow-hidden rounded-card border border-border bg-surface">
              <div className="px-4 py-3">
                <Logo />
                <p className="-mt-0.5 flex items-center gap-1.5 text-sm text-ink-2">
                  {logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                    <img src={logoUrl} alt="" className="size-5 rounded-sm object-contain" />
                  )}
                  <span className="[overflow-wrap:anywhere]">{name || t("previewName")}</span>
                </p>
              </div>
              <div className="h-[3px]" style={{ backgroundColor: colour }} />
            </div>
          </div>
        </div>
      </details>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SubmitButton pendingLabel={t("sending")}>{t("submit")}</SubmitButton>
        <p className="text-sm text-ink-2">{t("reviewNote")}</p>
      </div>
    </form>
  );
}
