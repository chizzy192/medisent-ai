import { ScanFlow } from "@/components/scan/ScanFlow";
import { patientRoles, requireRole } from "@/lib/auth/dal";

/** Scan a label or prescription (BUILD_PLAN Stage 2). Camera first, photo picker as fallback. */
export default async function ScanPage() {
  const { profile } = await requireRole(patientRoles);
  return (
    <main id="main" className="mx-auto w-full max-w-xl flex-1 px-4 py-5 sm:px-6">
      <ScanFlow locale={profile.language} rate={Number(profile.speech_rate) || 1} />
    </main>
  );
}
