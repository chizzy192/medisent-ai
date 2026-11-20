import { tr } from "@/lib/strings";
import { EmptyState } from "@/components/EmptyState";
import { VerifyCard, type QueueEntry } from "@/components/staff/VerifyCard";
import { SectionLabel } from "@/components/ui";
import type { PackRead } from "@/lib/ai/scan";
import { requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/db/admin";
import { createClient } from "@/lib/db/server";
import { verifierRoles } from "@/lib/intake";

type Row = {
  id: string;
  patient_id: string;
  drug_name: string;
  strength: string | null;
  form: string | null;
  dose: string | null;
  frequency_per_day: number;
  duration_days: number | null;
  with_food: QueueEntry["with_food"];
  quantity_dispensed: number | null;
  instructions: string | null;
  instructions_plain: string | null;
  nafdac_no: string | null;
  check_result: QueueEntry["check_result"];
  expiry_date: string | null;
  batch_no: string | null;
  pack_photo_path: string | null;
  rx_photo_path: string | null;
  ai_prefill: { pack?: PackRead } | null;
  created_at: string;
};

/**
 * Verification queue: every patient entry of this hospital still waiting, with its photos,
 * what the reader saw, and what the patient typed, side by side. Pharmacists and doctors only.
 */
export default async function VerifyPage() {
  const { hospital } = await requireRole(verifierRoles);
  const t = tr("verify");
  const supabase = await createClient();
  const { data } = await supabase
    .from("prescriptions")
    .select("id,patient_id,drug_name,strength,form,dose,frequency_per_day,duration_days,with_food,quantity_dispensed,instructions,instructions_plain,nafdac_no,check_result,expiry_date,batch_no,pack_photo_path,rx_photo_path,ai_prefill,created_at")
    .eq("source", "self")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as Row[];

  const admin = createAdminClient();
  const ids = [...new Set(rows.map((r) => r.patient_id))];
  const [{ data: people }, { data: rems }] = await Promise.all([
    ids.length ? admin.from("profiles").select("id,full_name,hospital_number").in("id", ids) : Promise.resolve({ data: [] as { id: string; full_name: string; hospital_number: string | null }[] }),
    rows.length ? admin.from("reminders").select("prescription_id,time_of_day").in("prescription_id", rows.map((r) => r.id)).order("time_of_day") : Promise.resolve({ data: [] as { prescription_id: string; time_of_day: string }[] }),
  ]);
  const person = new Map((people ?? []).map((p) => [p.id, p]));
  const times = new Map<string, string[]>();
  for (const r of rems ?? []) times.set(r.prescription_id, [...(times.get(r.prescription_id) ?? []), String(r.time_of_day).slice(0, 5)]);

  // Photos sit in a private bucket; the page hands out one-hour signed links.
  const paths = rows.flatMap((r) => [r.pack_photo_path, r.rx_photo_path]).filter((p): p is string => Boolean(p));
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await admin.storage.from("med-photos").createSignedUrls(paths, 3600);
    for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
  }

  const entries: QueueEntry[] = rows.map((r) => ({
    ...r,
    patient_name: person.get(r.patient_id)?.full_name ?? "",
    hospital_number: person.get(r.patient_id)?.hospital_number ?? null,
    times: times.get(r.id) ?? [],
    pack_url: r.pack_photo_path ? (signed.get(r.pack_photo_path) ?? null) : null,
    rx_url: r.rx_photo_path ? (signed.get(r.rx_photo_path) ?? null) : null,
    pack: r.ai_prefill?.pack ?? null,
  }));

  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 space-y-4 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <SectionLabel>{hospital?.name}</SectionLabel>
        <h1 className="mt-1 text-2xl">{t("title")}</h1>
        <p className="mt-1 text-base text-ink-2">{t("intro")}</p>
        <p className="mt-1 font-mono text-sm text-ink-2">{t("count", { count: entries.length })}</p>
      </div>
      {entries.length === 0 ? (
        <EmptyState label={t("title")} title={t("emptyTitle")}>
          <p>{t("emptyBody")}</p>
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {entries.map((e) => (
            <li key={e.id}>
              <VerifyCard entry={e} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
