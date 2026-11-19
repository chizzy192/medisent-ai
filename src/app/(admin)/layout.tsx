import { AppShell } from "@/components/AppShell";

// Hospital admin shell: header, Hospital admin navigation and page. TODO (Stage 1): role from the signed-in profile.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="admin">{children}</AppShell>;
}
