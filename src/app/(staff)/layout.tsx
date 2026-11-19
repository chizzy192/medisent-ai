import { AppShell } from "@/components/AppShell";
import { requireRole, staffRoles } from "@/lib/auth/dal";

/** Staff group: verified doctors, pharmacists, nurses and hospital admins. */
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  await requireRole(staffRoles);
  return <AppShell>{children}</AppShell>;
}
