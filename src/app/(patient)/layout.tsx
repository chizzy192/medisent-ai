import { AppShell } from "@/components/AppShell";

// Patient shell: header, Patient navigation and page. TODO (Stage 1): role from the signed-in profile.
export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="patient">{children}</AppShell>;
}
