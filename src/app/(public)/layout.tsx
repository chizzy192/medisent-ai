import { HospitalHeader } from "@/components/HospitalHeader";

// Public screens have no hospital yet, so the header bar is denim.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HospitalHeader />
      {children}
    </>
  );
}
