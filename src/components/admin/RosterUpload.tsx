"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { parseCsv } from "@/lib/csv";
import { patientColumns, staffColumns } from "@/lib/db/types";
import { uploadCsv, type UploadState } from "@/app/(admin)/actions";
import { validateRows, type RowIssue, type UploadKind } from "@/lib/roster";
import { Field, FormMessage, Input, describedBy } from "@/components/forms";
import { StatusChip } from "@/components/StatusChip";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, SectionLabel } from "@/components/ui";

const PREVIEW_ROWS = 8;

/**
 * CSV upload with preview (BUILD_PLAN Stage 1): the admin picks a file, sees the first rows
 * and the column check, then saves. The server parses and validates the file again.
 */
export function RosterUpload({ kind }: { kind: UploadKind }) {
  const t = useTranslations("roster");
  const [state, formAction] = useActionState(uploadCsv, { step: "idle" } as UploadState);
  const [preview, setPreview] = useState<{ headers: string[]; rows: Record<string, string>[]; total: number; missing: string[]; issues: RowIssue[]; encoding?: string } | null>(null);
  const required = kind === "staff" ? staffColumns : patientColumns;
  const inputId = `file-${kind}`;

  async function onFile(file: File | undefined) {
    if (!file) return setPreview(null);
    // Excel on Windows often saves Windows-1252; decode strictly as UTF-8 and fall back.
    const bytes = await file.arrayBuffer();
    let text: string;
    let encoding: string | undefined;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      text = new TextDecoder("windows-1252").decode(bytes);
      encoding = "windows-1252";
    }
    const { headers, rows } = parseCsv(text);
    const missing = required.filter((c) => !headers.includes(c));
    const issues = missing.length ? [] : validateRows(kind, rows).issues.slice(0, 20);
    setPreview({ headers, rows: rows.slice(0, PREVIEW_ROWS), total: rows.length, missing, issues, encoding });
  }

  const mine = state.step !== "idle" && state.kind === kind ? state : null;

  return (
    <Card as="section" className="space-y-4">
      <div>
        <SectionLabel as="h2">{t(`${kind}.label`)}</SectionLabel>
        <h3 className="mt-1 text-xl">{t(`${kind}.title`)}</h3>
        <p className="mt-1 text-base text-ink-2">{t(`${kind}.body`)}</p>
      </div>

      <div className="rounded-button bg-surface-2 p-3">
        <p className="label-mono">{t("columns")}</p>
        <p className="mt-1 font-mono text-sm [overflow-wrap:anywhere]">{required.join(", ")}</p>
        <a href={kind === "staff" ? "/templates/staff-roster.csv" : "/templates/patient-registry.csv"} download className="mt-2 inline-flex min-h-12 items-center text-base font-medium text-primary underline">
          {t("template")}
        </a>
      </div>

      <form action={formAction} className="space-y-4" encType="multipart/form-data">
        <input type="hidden" name="kind" value={kind} />
        <Field label={t("file")} htmlFor={inputId} hint={t("fileHint")}>
          <Input
            id={inputId}
            name="file"
            type="file"
            accept=".csv,text/csv"
            required
            onChange={(e) => onFile(e.target.files?.[0])}
            aria-describedby={describedBy(inputId, { hint: true })}
            className="py-2.5 file:mr-3 file:rounded-button file:border-0 file:bg-primary-tint file:px-3 file:py-1.5 file:font-medium file:text-primary"
          />
        </Field>

        {preview && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip tone={preview.missing.length ? "warning" : "success"}>
                {preview.missing.length ? t("columnsMissing", { columns: preview.missing.join(", ") }) : t("columnsOk")}
              </StatusChip>
              <span className="font-mono text-sm text-ink-2">{t("rowCount", { count: preview.total })}</span>
            </div>
            {preview.encoding && <FormMessage tone="info">{t("encodingNote")}</FormMessage>}
            {preview.issues.length > 0 && (
              <FormMessage tone="error">
                <p>{t("previewIssues", { count: preview.issues.length })}</p>
                <ul className="mt-2 space-y-0.5 font-mono text-sm">
                  {preview.issues.map((issue, i) => (
                    <li key={i}>
                      {t("rowLabel", { row: issue.row })} · {t.has(`issues.${issue.message}`) ? t(`issues.${issue.message}`) : issue.message}
                    </li>
                  ))}
                </ul>
              </FormMessage>
            )}
            <div tabIndex={0} role="region" aria-label={t("rowCount", { count: preview.total })} className="overflow-x-auto rounded-card border border-border">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">{t("previewNote", { shown: PREVIEW_ROWS })}</caption>
                <thead>
                  <tr className="bg-bg">
                    {preview.headers.map((h) => (
                      <th key={h} scope="col" className="label-mono px-3 py-2 text-left font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i} className="border-t border-surface-2">
                      {preview.headers.map((h) => (
                        <td key={h} className="px-3 py-2 whitespace-nowrap">
                          {row[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.total > PREVIEW_ROWS && <p className="text-sm text-ink-2">{t("previewNote", { shown: PREVIEW_ROWS })}</p>}
          </div>
        )}

        {mine?.step === "done" && (
          <FormMessage tone="success">{t("saved", { inserted: mine.inserted, updated: mine.updated })}</FormMessage>
        )}
        {mine?.step === "error" && (
          <FormMessage tone="error">
            <p>{t(`errors.${mine.error ?? "server"}`)}</p>
            {mine.issues && mine.issues.length > 0 && (
              <ul className="mt-2 space-y-0.5 font-mono text-sm">
                {mine.issues.map((issue, i) => (
                  <li key={i}>
                    {t("rowLabel", { row: issue.row })} · {t.has(`issues.${issue.message}`) ? t(`issues.${issue.message}`) : issue.message}
                  </li>
                ))}
              </ul>
            )}
          </FormMessage>
        )}

        <SubmitButton pendingLabel={t("saving")}>{t("save")}</SubmitButton>
      </form>
    </Card>
  );
}
