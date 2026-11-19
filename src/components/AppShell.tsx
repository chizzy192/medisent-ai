import type { ReactNode } from "react";
import type { NavCounts, NavRole } from "@/config/nav";
import { demoHospital, demoMode } from "@/config/demo";
import { BottomNav, Sidebar } from "./BottomNav";
import { HospitalHeader } from "./HospitalHeader";

/**
 * Signed-in shell: hospital header, then the role's navigation (bottom bar on phones and
 * tablets, sidebar for staff/admin on desktop) and the page. Page content gets bottom padding
 * equal to the bar so nothing is covered.
 * TODO (Stage 1): role, hospital and badge counts come from the signed-in profile.
 */
export function AppShell({ role, counts, children }: { role: NavRole; counts?: NavCounts; children: ReactNode }) {
  const hospital = demoMode ? demoHospital : null;
  const padForBar = "pb-[calc(64px+env(safe-area-inset-bottom)+24px)]";
  return (
    <>
      <HospitalHeader hospital={hospital} />
      <div className="flex flex-1">
        {role !== "patient" && <Sidebar role={role} counts={counts} />}
        <div className={`min-w-0 flex-1 ${padForBar} ${role === "patient" ? "" : "lg:pb-10"}`}>{children}</div>
      </div>
      <BottomNav role={role} counts={counts} />
    </>
  );
}
