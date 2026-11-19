import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/LoginForm";
import { FormPage } from "@/components/forms";
import { HospitalHeader } from "@/components/HospitalHeader";
import { SetupNotice } from "@/components/SetupNotice";
import { getSession } from "@/lib/auth/dal";
import { isServiceRoleConfigured } from "@/lib/db/env";
import { homeForRole } from "@/lib/db/types";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "";
  const reason = typeof params.reason === "string" ? params.reason : undefined;
  const session = await getSession();
  if (session && session.profile.verified_status === "verified") redirect(homeForRole[session.profile.role]);

  const t = await getTranslations("login");
  return (
    <>
      <HospitalHeader />
      <FormPage title={t("title")} intro={t("intro")}>
        {!isServiceRoleConfigured() && <SetupNotice />}
        <div className="mt-4">
          <LoginForm next={next} reason={reason} />
        </div>
      </FormPage>
    </>
  );
}
