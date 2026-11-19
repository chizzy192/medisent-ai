import { HospitalHeader } from "@/components/HospitalHeader";

// Platform admin: no hospital and no bottom bar (not in the section 3 tab sets).
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HospitalHeader />
      {children}
    </>
  );
}
