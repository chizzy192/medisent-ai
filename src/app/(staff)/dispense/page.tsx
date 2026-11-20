import Link from "next/link";
import { tr } from "@/lib/strings";
import { DispenseForm } from "@/components/staff/DispenseForm";
import { Input } from "@/components/forms";
import { Card, SectionLabel } from "@/components/ui";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/db/server";
import { dispenserRoles, patientOfHospital } from "@/lib/intake";

type Row = { id: string; full_name: string; hospital_number: string | null };

/**
 * Staff "Dispense": find the patient (name or hospital number, RLS-scoped to the hospital),
 * then the dispensing form for that patient. Pharmacists and doctors only.
 */
export default async function DispensePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireRole(dispenserRoles);
  const params = await searchParams;
  const t = tr("dispense");
  const patientId = typeof params.patient === "string" ? params.patient : "";
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 60) : "";

  if (patientId) {
    const patient = await patientOfHospital(session, patientId);
    if (patient) {
      return (
        <main id="main" className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6 sm:px-6 sm:py-8">
          <div>
            <Link href="/dispense" className="text-base font-medium text-primary underline">
              {t("changePatient")}
            </Link>
            <SectionLabel className="mt-3">{t("title")}</SectionLabel>
            <h1 className="mt-1 text-2xl [overflow-wrap:anywhere]">{patient.full_name}</h1>
            <p className="font-mono text-sm text-ink-2">{patient.hospital_number ?? "—"}</p>
          </div>
          <DispenseForm patientId={patient.id} patientName={patient.full_name} />
        </main>
      );
    }
  }

  const supabase = await createClient();
  let req = supabase.from("profiles").select("id,full_name,hospital_number").eq("role", "patient").order("full_name").limit(30);
  if (q) req = req.or(`full_name.ilike.%${q.replace(/[%_,()]/g, " ")}%,hospital_number.ilike.%${q.replace(/[%_,()]/g, " ")}%`);
  const { data } = await req;
  const rows = (data ?? []) as Row[];

  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <SectionLabel>{session.hospital?.name}</SectionLabel>
        <h1 className="mt-1 text-2xl">{t("title")}</h1>
        <p className="mt-1 text-base text-ink-2">{t("intro")}</p>
      </div>
      <form method="get" className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="q" className="sr-only">
          {t("search")}
        </label>
        <Input id="q" name="q" defaultValue={q} placeholder={t("searchPlaceholder")} className="flex-1" autoComplete="off" />
        <button type="submit" className="btn-primary px-5">
          {t("searchButton")}
        </button>
      </form>
      {rows.length === 0 ? (
        <p className="text-base text-ink-2">{t("noPatients")}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((p) => (
            <Card as="li" key={p.id} className="p-0">
              <Link href={`/dispense?patient=${p.id}`} className="flex min-h-14 flex-wrap items-center justify-between gap-3 p-4 hover:bg-bg">
                <span className="min-w-0 flex-[1_1_12rem]">
                  <span className="block text-lg font-semibold [overflow-wrap:anywhere]">{p.full_name}</span>
                  <span className="block font-mono text-sm text-ink-2">{p.hospital_number ?? "—"}</span>
                </span>
                <span className="text-base font-medium text-primary">{t("pick")}</span>
              </Link>
            </Card>
          ))}
        </ul>
      )}
    </main>
  );
}
