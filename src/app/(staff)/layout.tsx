import { AppShell } from "@/components/AppShell";

// Staff shell: header, Staff navigation and page. TODO (Stage 1): role from the signed-in profile.
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="staff">{children}</AppShell>;
}
