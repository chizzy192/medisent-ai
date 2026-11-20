import Link from "next/link";
import { tr, formatDate } from "@/lib/strings";
import { AlertBanner, alertActionClass } from "@/components/AlertBanner";
import { ClinicMap, type Clinic } from "@/components/redflag/ClinicMap";
import { PhoneIcon } from "@/components/icons";
import { ListenButton } from "@/components/ListenButton";
import { Card, SectionLabel } from "@/components/ui";
import { EMERGENCY_NUMBER, helplines } from "@/config/helplines";
import { patientRoles, requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/db/server";

/**
 * Red-flag screen (BUILD_PLAN Stage 3): the only solid red in the app. Calm, short, direct:
 * one sentence of what to do, a big call button, the nearest clinics on a map and as a list.
 * `?kind=crisis` shows the helpline version instead (self-harm words). The staff alert and
 * caregiver SMS were already sent by the API that detected the words.
 */
export default async function RedFlagPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { profile, hospital } = await requireRole(patientRoles);
  const params = await searchParams;
  const kind = params.kind === "crisis" ? "crisis" : "emergency";
  const t = tr("redflag");
  const supabase = await createClient();
  const { data } = await supabase.from("clinics").select("id,name,address,lat,lng,phone,hours").order("name");
  const clinics = (data ?? []) as Clinic[];
  // Centre on the patient's hospital when it is in the clinic list, else the first clinic.
  const home = clinics.find((c) => hospital && c.name === hospital.name) ?? clinics.find((c) => c.lat !== null);
  const center = home?.lat !== null && home?.lng !== null && home ? { lat: home.lat!, lng: home.lng! } : { lat: 6.8567, lng: 7.3958 };
  const sorted = [...clinics].sort((a, b) => dist(a, center) - dist(b, center)).slice(0, 4);
  const callNumber = hospital?.contact_phone ?? EMERGENCY_NUMBER;
  const spoken = kind === "crisis" ? `${t("crisis.title")}. ${t("crisis.body")}` : `${t("emergency.title")}. ${t("emergency.body")}`;
  const rate = Number(profile.speech_rate) || 1;

  return (
    <main id="main" className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 py-5 sm:px-6" data-testid={`redflag-${kind}`}>
      <AlertBanner
        live
        label={t("label", { time: formatDate(new Date(), { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }) })}
        title={t(`${kind}.title`)}
        action={
          kind === "crisis" ? (
            <a href={`tel:${helplines[0].phone}`} className={alertActionClass} data-testid="call-helpline">
              <PhoneIcon size={22} /> {t("crisis.call", { name: helplines[0].name })}
            </a>
          ) : (
            <a href={`tel:${callNumber}`} className={alertActionClass} data-testid="call-now">
              <PhoneIcon size={22} /> {hospital?.contact_phone ? t("emergency.callHospital", { hospital: hospital.name }) : t("emergency.call112")}
            </a>
          )
        }
      >
        <p>{t(`${kind}.body`)}</p>
      </AlertBanner>

      <div className="flex flex-wrap items-center gap-3">
        <ListenButton text={spoken} rate={rate} />
        <span className="text-sm text-ink-2">{t("staffTold")}</span>
      </div>

      {kind === "crisis" ? (
        <Card as="section" className="space-y-3">
          <SectionLabel as="h2">{t("crisis.helplines")}</SectionLabel>
          <ul className="divide-y divide-surface-2">
            {helplines.map((h) => (
              <li key={h.phone} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="min-w-0">
                  <span className="block font-semibold">{h.name}</span>
                  <span className="block text-sm text-ink-2">
                    {h.hours} · {h.note}
                  </span>
                </span>
                <a href={`tel:${h.phone}`} className="btn-outline px-4">
                  <PhoneIcon size={18} /> {t("call")}
                </a>
              </li>
            ))}
          </ul>
          <p className="text-sm text-ink-2">{t("crisis.verify")}</p>
          {hospital?.contact_phone && (
            <a href={`tel:${hospital.contact_phone}`} className="btn-outline w-full">
              <PhoneIcon size={18} /> {t("emergency.callHospital", { hospital: hospital.name })}
            </a>
          )}
        </Card>
      ) : (
        <Card as="section" className="space-y-3">
          <SectionLabel as="h2">{t("nearest")}</SectionLabel>
          <ClinicMap clinics={sorted} center={center} />
          <ul className="divide-y divide-surface-2" data-testid="clinic-list">
            {sorted.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="min-w-0">
                  <span className="block font-semibold">{c.name}</span>
                  <span className="block text-sm text-ink-2">
                    {c.address}
                    {c.hours ? ` · ${c.hours}` : ""}
                  </span>
                </span>
                {c.phone && (
                  <a href={`tel:${c.phone}`} className="btn-outline px-4">
                    <PhoneIcon size={18} /> {t("call")}
                  </a>
                )}
              </li>
            ))}
          </ul>
          <p className="text-sm text-ink-2">{t("emergency.also112")}</p>
        </Card>
      )}

      <Link href="/home" className="btn-outline w-full">
        {t("backHome")}
      </Link>
    </main>
  );
}

function dist(c: Clinic, o: { lat: number; lng: number }) {
  if (c.lat === null || c.lng === null) return 1e9;
  return (c.lat - o.lat) ** 2 + (c.lng - o.lng) ** 2;
}
