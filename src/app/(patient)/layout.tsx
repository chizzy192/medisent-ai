import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth/dal";

/**
 * Patient group. /forum and /me are shared by every role, so this layout only requires a
 * signed-in, verified account; patient-only pages call requireRole(patientRoles) themselves.
 */
export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.profile.verified_status !== "verified") redirect("/login?reason=unverified");
  return <AppShell>{children}</AppShell>;
}
