import { AppShell } from "@/components/AppShell";
import { platformRoles, requireRole } from "@/lib/auth/dal";

/** Platform admin: header only, no hospital and no bottom bar (not in the section 3 tab sets). */
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  await requireRole(platformRoles);
  return <AppShell>{children}</AppShell>;
}
