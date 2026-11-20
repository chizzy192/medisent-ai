import Link from "next/link";
import { tr, formatDate } from "@/lib/strings";
import { EmptyState } from "@/components/EmptyState";
import { StatusChip, type ChipTone } from "@/components/StatusChip";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, SectionLabel } from "@/components/ui";
import { requireRole, staffRoles } from "@/lib/auth/dal";
import { createClient } from "@/lib/db/server";
import { handleAlert } from "./actions";

type Row = { id: string; patient_id: string | null; type: string; detail: string | null; status: "open" | "handled"; created_at: string; source: string | null };
const tone: Record<string, ChipTone> = { red_flag: "danger", side_effect: "warning", missed_doses: "warning", high_risk: "danger", interaction: "danger", question: "primary", drug_not_found: "warning", refill: "neutral", course_at_risk: "warning", course_stopped: "warning", verification_blocked: "neutral" };

/** Staff Alerts tab: open alerts of the hospital, red flags first, then the last handled ones. */
export default async function AlertsPage() {
  const { hospital } = await requireRole(staffRoles);
  const t = tr("alerts");
  const supabase = await createClient();
  const [{ data: open }, { data: handled }] = await Promise.all([
    supabase.from("alerts").select("id,patient_id,type,detail,status,created_at,source").eq("status", "open").order("created_at", { ascending: false }).limit(100),
    supabase.from("alerts").select("id,patient_id,type,detail,status,created_at,source").eq("status", "handled").order("handled_at", { ascending: false }).limit(10),
  ]);
  const rows = (open ?? []) as Row[];
  const urgent = (r: Row) => r.type === "red_flag" || r.type === "high_risk" || r.type === "interaction";
  const sorted = [...rows].sort((a, b) => Number(urgent(b)) - Number(urgent(a)));
  const ids = [...new Set([...rows, ...((handled ?? []) as Row[])].map((r) => r.patient_id).filter(Boolean))] as string[];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id,full_name").in("id", ids) : { data: [] as { id: string; full_name: string }[] };
  const name = new Map((people ?? []).map((p) => [p.id, p.full_name]));
  const when = (iso: string) => formatDate(new Date(iso), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });

  const Item = ({ r }: { r: Row }) => (
    <Card as="li" className={`space-y-2 ${r.type === "red_flag" && r.status === "open" ? "border-2 border-danger" : ""}`} testId={`alert-${r.type}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip tone={tone[r.type] ?? "neutral"}>{t(`types.${r.type}`)}</StatusChip>
          {r.patient_id && (
            <Link href={`/patients/${r.patient_id}`} className="font-semibold text-primary underline">
              {name.get(r.patient_id) ?? "—"}
            </Link>
          )}
        </div>
        <span className="font-mono text-sm text-ink-2">{when(r.created_at)}</span>
      </div>
      <p className="text-base [overflow-wrap:anywhere]">{r.detail}</p>
      {r.status === "open" && (
        <form action={handleAlert}>
          <input type="hidden" name="id" value={r.id} />
          <SubmitButton variant="outline" pendingLabel={t("handling")} className="px-4 text-sm">
            {t("markHandled")}
          </SubmitButton>
        </form>
      )}
    </Card>
  );

  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <SectionLabel>{hospital?.name}</SectionLabel>
        <h1 className="mt-1 text-2xl">{t("title")}</h1>
        <p className="mt-1 font-mono text-sm text-ink-2">{t("count", { count: rows.length })}</p>
      </div>
      {sorted.length === 0 ? (
        <EmptyState label={t("title")} title={t("emptyTitle")}>
          <p>{t("emptyBody")}</p>
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {sorted.map((r) => (
            <Item key={r.id} r={r} />
          ))}
        </ul>
      )}
      {(handled ?? []).length > 0 && (
        <section className="space-y-3">
          <SectionLabel as="h2">{t("handledTitle")}</SectionLabel>
          <ul className="space-y-3 opacity-80">
            {((handled ?? []) as Row[]).map((r) => (
              <Item key={r.id} r={r} />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
