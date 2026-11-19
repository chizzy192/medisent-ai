import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SignupForm } from "@/components/auth/SignupForm";
import { FormPage } from "@/components/forms";
import { HospitalHeader } from "@/components/HospitalHeader";
import { SetupNotice } from "@/components/SetupNotice";
import { getSession } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/db/admin";
import { isServiceRoleConfigured } from "@/lib/db/env";
import { homeForRole } from "@/lib/db/types";

export default async function SignupPage() {
  const session = await getSession();
  if (session && session.profile.verified_status === "verified") redirect(homeForRole[session.profile.role]);

  const t = await getTranslations("signup");
  let hospitals: { id: string; name: string }[] = [];
  if (isServiceRoleConfigured()) {
    const { data } = await createAdminClient().from("hospitals").select("id,name").eq("status", "approved").order("name");
    hospitals = data ?? [];
  }

  return (
    <>
      <HospitalHeader />
      <FormPage title={t("title")} intro={t("intro")}>
        {!isServiceRoleConfigured() && <SetupNotice />}
        <div className="mt-4">
          <SignupForm hospitals={hospitals} />
        </div>
      </FormPage>
    </>
  );
}
