import { HospitalHeader } from "@/components/HospitalHeader";

// TODO (Stage 1): load the signed-in user's hospital for the header and add BottomNav.
export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HospitalHeader />
      {children}
    </>
  );
}
