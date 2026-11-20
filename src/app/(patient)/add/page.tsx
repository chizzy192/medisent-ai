import { AddMedicineFlow } from "@/components/add/AddMedicineFlow";
import { patientRoles, requireRole } from "@/lib/auth/dal";

/** Patient adds a medicine: photos → AI pre-fill → pick from the formulary → type the dose as told. */
export default async function AddMedicinePage() {
  const { profile, hospital } = await requireRole(patientRoles);
  return (
    <main id="main" className="mx-auto w-full max-w-xl flex-1 px-4 py-5 sm:px-6">
      <AddMedicineFlow rate={Number(profile.speech_rate) || 1} hasHospital={Boolean(hospital)} />
    </main>
  );
}
