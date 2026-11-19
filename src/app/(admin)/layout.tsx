import { AppShell } from "@/components/AppShell";
import { adminRoles, requireRole } from "@/lib/auth/dal";

/** Hospital admin group. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(adminRoles);
  return <AppShell>{children}</AppShell>;
}
