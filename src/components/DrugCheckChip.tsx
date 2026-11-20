import { tr } from "@/lib/strings";
import type { DrugCheckResult } from "@/lib/drugcheck";
import { StatusChip, type ChipTone } from "./StatusChip";

const tone: Record<DrugCheckResult, ChipTone> = { registered: "success", not_found: "warning", mismatch: "warning", unreadable: "neutral" };

/** Dot + word for a registration check result; the calm sentence goes beside it. */
export function DrugCheckChip({ result }: { result: DrugCheckResult | null }) {
  const t = tr("drugCheck");
  if (!result) return <StatusChip tone="neutral">{t("chips.none")}</StatusChip>;
  return <StatusChip tone={tone[result]}>{t(`chips.${result}`)}</StatusChip>;
}

/**
 * Full explanation for the confirm screen and the medicines list. Calm, never "fake", never
 * blames the patient; the next step is always "check the pack, then show your pharmacist".
 */
export function DrugCheckNote({
  result,
  listedName,
  listedStrength,
  manufacturer,
  typedName,
  typedStrength,
}: {
  result: DrugCheckResult | null;
  listedName?: string | null;
  listedStrength?: string | null;
  manufacturer?: string | null;
  typedName?: string;
  typedStrength?: string;
}) {
  const t = tr("drugCheck");
  if (!result) return null;
  let body: string;
  if (result === "registered") {
    body = listedName ? t("notes.registeredNamed", { name: listedName, strength: listedStrength ?? "", manufacturer: manufacturer ?? "" }) : t("notes.registered");
  } else if (result === "mismatch" && listedName) {
    const sameName = typedName && listedName.toLowerCase().replace(/[^a-z0-9]/g, "") === typedName.toLowerCase().replace(/[^a-z0-9]/g, "");
    body = sameName
      ? t("notes.mismatchStrength", { name: listedName, listedStrength: listedStrength ?? "", strength: typedStrength ?? "" })
      : t("notes.mismatchNamed", { name: listedName, typedName: typedName ?? "" });
  } else {
    body = t(`notes.${result}`);
  }
  return (
    <div className="space-y-2">
      <p className="text-base text-ink-2">{body}</p>
      {(result === "not_found" || result === "mismatch") && (
        <p className="text-base text-ink-2">
          {t("reportLead")}{" "}
          <a href="https://www.nafdac.gov.ng/" target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center underline">
            {t("reportLink")}
          </a>
        </p>
      )}
    </div>
  );
}
