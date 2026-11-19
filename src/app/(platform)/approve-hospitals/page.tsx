import { getFormatter, getTranslations } from "next-intl/server";
import { licenceLink } from "@/app/(platform)/actions";
import { ReviewForm } from "@/components/admin/ReviewForm";
import { EmptyState } from "@/components/EmptyState";
import { StatusChip, type ChipTone } from "@/components/StatusChip";
import { Card, SectionLabel } from "@/components/ui";
import { platformRoles, requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/db/admin";
import type { Hospital, HospitalStatus } from "@/lib/db/types";

// Rejected is a warning state, not an emergency: red stays for red flags and high risk.
const tone: Record<HospitalStatus, ChipTone> = { pending: "neutral", approved: "success", rejected: "warning" };

/** Platform admin: review registered hospitals, open the licence, approve or reject. */
export default async function ApproveHospitalsPage() {
  await requireRole(platformRoles);
  const t = await getTranslations("approveHospitals");
  const format = await getFormatter();
  const admin = createAdminClient();
  // Oldest registration first: the hospital waiting longest is at the top.
  const { data } = await admin.from("hospitals").select("*").order("created_at", { ascending: true });
  const hospitals = (data ?? []) as Hospital[];
  const pending = hospitals.filter((h) => h.status === "pending");
  const reviewed = hospitals.filter((h) => h.status !== "pending");
  const links = Object.fromEntries(
    await Promise.all(pending.filter((h) => h.licence_url).map(async (h) => [h.id, await licenceLink(h.licence_url!)] as const)),
  );
  const when = (iso: string) => format.dateTime(new Date(iso), { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" });

  const HospitalCard = ({ h, review }: { h: Hospital; review: boolean }) => (
    <Card as="li" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-[1_1_16rem]">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="size-4 shrink-0 rounded-full border border-border" style={{ backgroundColor: h.brand_color }} />
            <h3 className="text-xl [overflow-wrap:anywhere]">{h.name}</h3>
          </div>
          <p className="mt-1 text-base text-ink-2">
            {[h.address, h.city, h.state].filter(Boolean).join(", ")}
          </p>
          <dl className="mt-2 grid gap-x-6 gap-y-1 font-mono text-sm sm:grid-cols-2">
            <div>
              <dt className="label-mono">{t("cac")}</dt>
              <dd>{h.cac_no ?? "—"}</dd>
            </div>
            <div>
              <dt className="label-mono">{t("registered")}</dt>
              <dd>{when(h.created_at)}</dd>
            </div>
            <div>
              <dt className="label-mono">{t("contact")}</dt>
              <dd className="font-sans [overflow-wrap:anywhere]">{h.contact_name} · {h.contact_phone} · {h.contact_email}</dd>
            </div>
            <div>
              <dt className="label-mono">{t("licence")}</dt>
              <dd>
                {h.licence_url && links[h.id] ? (
                  <a href={links[h.id]!} target="_blank" rel="noreferrer" className="text-primary underline">
                    {t("openLicence")}
                  </a>
                ) : (
                  t("noLicence")
                )}
              </dd>
            </div>
          </dl>
        </div>
        <StatusChip tone={tone[h.status]}>{t(`status.${h.status}`)}</StatusChip>
      </div>
      <ReviewForm hospitalId={h.id} mode={review ? "review" : "reviewed"} note={h.review_note} />
    </Card>
  );

  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <SectionLabel>{t("label")}</SectionLabel>
        <h1 className="mt-1 text-2xl">{t("title")}</h1>
        <p className="mt-2 text-base text-ink-2">{t("intro")}</p>
      </div>
      <section aria-labelledby="pending-title" className="space-y-3">
        <h2 id="pending-title" className="text-xl">
          {t("pendingTitle")} <span className="font-mono text-base text-ink-2">{pending.length}</span>
        </h2>
        {pending.length === 0 ? (
          <EmptyState label={t("label")} title={t("nonePending")}>
            <p>{t("nonePendingBody")}</p>
          </EmptyState>
        ) : (
          <ul className="space-y-4">
            {pending.map((h) => (
              <HospitalCard key={h.id} h={h} review />
            ))}
          </ul>
        )}
      </section>
      {reviewed.length > 0 && (
        <section aria-labelledby="reviewed-title" className="space-y-3">
          <h2 id="reviewed-title" className="text-xl">
            {t("reviewedTitle")} <span className="font-mono text-base text-ink-2">{reviewed.length}</span>
          </h2>
          <ul className="space-y-4">
            {reviewed.map((h) => (
              <HospitalCard key={h.id} h={h} review={false} />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
