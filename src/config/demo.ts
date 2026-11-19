import type { HeaderHospital } from "@/components/HospitalHeader";
import type { PillShape } from "@/components/PillIcon";

/**
 * Fictional demo data (BUILD_PLAN section 7). Every name is labelled "Demo".
 * Used by app-shell placeholders until Stage 1 loads the signed-in user's hospital.
 */
export const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const demoHospital: HeaderHospital = {
  name: "Adaeze Specialist Hospital (Demo)",
  brandColor: "#1D4E89",
};

/** Dev-only component gallery data; the worst case is the reflow test string. */
export const demoMedicines: {
  name: string;
  strength: string;
  time: string;
  dose: string;
  pill: { shape: PillShape; color: string };
}[] = [
  { name: "Amlodipine", strength: "5 mg", time: "08:00", dose: "1 tablet", pill: { shape: "round", color: "#E05A5A" } },
  { name: "Metformin", strength: "500 mg", time: "14:00", dose: "after food", pill: { shape: "capsule", color: "#E8EDF3" } },
  {
    name: "Artemether-lumefantrine",
    strength: "80/480 mg",
    time: "20:00",
    dose: "after food",
    pill: { shape: "oval", color: "#F2C94C" },
  },
];
