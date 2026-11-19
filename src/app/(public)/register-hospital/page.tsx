import { getTranslations } from "next-intl/server";
import { RegisterHospitalForm } from "@/components/auth/RegisterHospitalForm";
import { FormPage } from "@/components/forms";
import { HospitalHeader } from "@/components/HospitalHeader";
import { SetupNotice } from "@/components/SetupNotice";
import { isServiceRoleConfigured } from "@/lib/db/env";

export default async function RegisterHospitalPage() {
  const t = await getTranslations("registerHospital");
  return (
    <>
      <HospitalHeader />
      <FormPage title={t("title")} intro={t("intro")}>
        {!isServiceRoleConfigured() && <SetupNotice />}
        <div className="mt-4">
          <RegisterHospitalForm />
        </div>
      </FormPage>
    </>
  );
}
