import type { ReactNode } from "react";
import type { NavCounts, NavRole } from "@/config/nav";
import { getSession } from "@/lib/auth/dal";
import { createClient } from "@/lib/db/server";
import type { Role } from "@/lib/db/types";
import { BottomNav, Sidebar } from "./BottomNav";
import { HospitalHeader } from "./HospitalHeader";

const navRoleFor: Record<Role, NavRole | null> = {
  patient: "patient",
  doctor: "staff",
  pharmacist: "staff",
  nurse: "staff",
  hospital_admin: "admin",
  platform_admin: null,
};

/**
 * Signed-in shell: hospital header (name, logo, brand bar), then the role's navigation
 * (bottom bar on phones and tablets, sidebar for staff/admin on desktop) and the page. The
 * role, hospital and badge counts come from the signed-in profile. Page content gets bottom
 * padding equal to the bar so nothing is covered.
 */
export async function AppShell({ children }: { children: ReactNode }) {
  const session = await getSession();
  const role = session ? navRoleFor[session.profile.role] : null;
  const hospital = session?.hospital
    ? { name: session.hospital.name, brandColor: session.hospital.brand_color, logoUrl: session.hospital.logo_url }
    : null;

  let counts: NavCounts = {};
  if (role === "staff" || role === "admin") {
    const supabase = await createClient();
    const [redFlags, questions] = await Promise.all([
      supabase.from("alerts").select("id", { count: "exact", head: true }).eq("status", "open").eq("type", "red_flag"),
      supabase.from("alerts").select("id", { count: "exact", head: true }).eq("status", "open").eq("type", "question"),
    ]);
    counts = { redFlags: redFlags.count ?? 0, questions: questions.count ?? 0 };
  }

  const padForBar = "pb-[calc(var(--bottom-nav-h,calc(64px+env(safe-area-inset-bottom)))+24px)]";
  return (
    <>
      <HospitalHeader hospital={hospital} />
      <div className="flex flex-1">
        {(role === "staff" || role === "admin") && <Sidebar role={role} counts={counts} />}
        <div className={`min-w-0 flex-1 ${role ? padForBar : "pb-10"} ${role === "patient" ? "" : "lg:pb-10"}`}>{children}</div>
      </div>
      {role && <BottomNav role={role} counts={counts} />}
    </>
  );
}
