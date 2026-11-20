import { tr, formatDate } from "@/lib/strings";
import { setMemberStatus, unblockAttempt } from "@/app/(admin)/actions";
import { StatusChip, type ChipTone } from "@/components/StatusChip";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, SectionLabel } from "@/components/ui";
import { EmptyState } from "@/components/EmptyState";
import { adminRoles, requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/db/admin";
import type { Profile, VerificationAttempt, VerifiedStatus } from "@/lib/db/types";

const tone: Record<VerifiedStatus, ChipTone> = { verified: "success", pending: "neutral", rejected: "warning", blocked: "danger" };

/** Hospital admin: who has joined, who is blocked after three failed matches, and unblocking. */
export default async function VerificationsPage() {
  const { profile, hospital } = await requireRole(adminRoles);
  const t = tr("verifications");
  const admin = createAdminClient();
  const hospitalId = profile.hospital_id!;

  const [{ data: blocked }, { data: members }] = await Promise.all([
    admin.from("verification_attempts").select("*").eq("hospital_id", hospitalId).not("blocked_at", "is", null).order("last_attempt_at", { ascending: false }),
    admin.from("profiles").select("*").eq("hospital_id", hospitalId).order("created_at", { ascending: false }).limit(500),
  ]);
  const blockedRows = (blocked ?? []) as VerificationAttempt[];
  const people = (members ?? []) as Profile[];
  const when = (iso: string) => formatDate(new Date(iso), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });

  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <SectionLabel>{hospital?.name}</SectionLabel>
        <h1 className="mt-1 text-2xl">{t("title")}</h1>
        <p className="mt-2 text-base text-ink-2">{t("intro")}</p>
      </div>

      <section aria-labelledby="blocked-title" className="space-y-3">
        <h2 id="blocked-title" className="text-xl">
          {t("blockedTitle")} <span className="font-mono text-base text-ink-2">{blockedRows.length}</span>
        </h2>
        {blockedRows.length === 0 ? (
          <p className="text-base text-ink-2">{t("noBlocked")}</p>
        ) : (
          <ul className="space-y-3">
            {blockedRows.map((row) => (
              <Card as="li" key={row.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-lg font-medium [overflow-wrap:anywhere]">{row.identifier.toUpperCase()}</p>
                  <p className="text-sm text-ink-2">
                    {t(`roles.${row.role}`)} · {t("failedAt", { count: row.failed_attempts, time: when(row.last_attempt_at) })}
                  </p>
                </div>
                <form action={unblockAttempt}>
                  <input type="hidden" name="id" value={row.id} />
                  <SubmitButton variant="outline" pendingLabel={t("unblocking")} ariaLabel={t("unblockId", { id: row.identifier.toUpperCase() })}>
                    {t("unblock")}
                  </SubmitButton>
                </form>
              </Card>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="members-title" className="space-y-3">
        <h2 id="members-title" className="text-xl">
          {t("membersTitle")} <span className="font-mono text-base text-ink-2">{people.length}</span>
        </h2>
        {people.length === 0 ? (
          <EmptyState label={t("membersLabel")} title={t("noMembers")}>
            <p>{t("noMembersBody")}</p>
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {people.map((p) => (
              <Card as="li" key={p.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-[1_1_14rem]">
                  <p className="text-lg font-semibold [overflow-wrap:anywhere]">{p.full_name}</p>
                  <p className="font-mono text-sm text-ink-2">
                    {t(`roles.${p.role}`)} · {p.staff_id ?? p.hospital_number ?? "—"} · {when(p.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip tone={tone[p.verified_status]}>{t(`status.${p.verified_status}`)}</StatusChip>
                  {p.id !== profile.id && (
                    <form action={setMemberStatus}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="status" value={p.verified_status === "blocked" ? "verified" : "blocked"} />
                      <SubmitButton
                        variant="outline"
                        pendingLabel={t("saving")}
                        className="min-h-12 px-3 text-sm"
                        ariaLabel={p.verified_status === "blocked" ? t("restorePerson", { name: p.full_name }) : t("blockPerson", { name: p.full_name })}
                      >
                        {p.verified_status === "blocked" ? t("restore") : t("block")}
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </Card>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
