import { getTranslations } from "next-intl/server";
import { RosterUpload } from "@/components/admin/RosterUpload";
import { adminRoles, requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/db/admin";
import { SectionLabel } from "@/components/ui";

/** Hospital admin: upload the staff roster and the patient registry (CSV with preview). */
export default async function RosterPage() {
  const { profile, hospital } = await requireRole(adminRoles);
  const t = await getTranslations("roster");
  const admin = createAdminClient();
  const [staff, patients] = await Promise.all([
    admin.from("staff_roster").select("id", { count: "exact", head: true }).eq("hospital_id", profile.hospital_id!),
    admin.from("patient_registry").select("id", { count: "exact", head: true }).eq("hospital_id", profile.hospital_id!),
  ]);

  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <SectionLabel>{hospital?.name}</SectionLabel>
        <h1 className="mt-1 text-2xl">{t("title")}</h1>
        <p className="mt-2 text-base text-ink-2">{t("intro")}</p>
        <p className="mt-2 font-mono text-sm text-ink-2">
          {t("counts", { staff: staff.count ?? 0, patients: patients.count ?? 0 })}
        </p>
      </div>
      <RosterUpload kind="staff" />
      <RosterUpload kind="patients" />
    </main>
  );
}
