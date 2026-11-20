/**
 * Row types for the tables Stage 1 touches (mirrors supabase/migrations/0001_schema.sql).
 * Hand-written until the Supabase CLI can generate them (no CLI on this machine yet).
 */
export type Role = "platform_admin" | "hospital_admin" | "doctor" | "pharmacist" | "nurse" | "patient";
export type StaffRole = Exclude<Role, "platform_admin" | "patient">;
export type HospitalStatus = "pending" | "approved" | "rejected";
export type VerifiedStatus = "pending" | "verified" | "rejected" | "blocked";
export type LicenceBody = "MDCN" | "PCN" | "NMCN";
export type WithFood = "before" | "after" | "with" | "any";
export const withFoodValues: WithFood[] = ["before", "after", "with", "any"];
/** Where a prescription came from and whether a pharmacist has checked it (0010_intake.sql). */
export type PrescriptionSource = "hospital" | "self";
export type PrescriptionStatus = "pending" | "verified" | "edited" | "rejected";

export const staffRoles: StaffRole[] = ["hospital_admin", "doctor", "pharmacist", "nurse"];
export const signupRoles: Exclude<Role, "platform_admin">[] = ["patient", "doctor", "pharmacist", "nurse", "hospital_admin"];
export const licenceBodies: LicenceBody[] = ["MDCN", "PCN", "NMCN"];

export type Hospital = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string;
  address: string | null;
  city: string | null;
  state: string | null;
  cac_no: string | null;
  licence_url: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  status: HospitalStatus;
  review_note: string | null;
  reviewed_at: string | null;
  is_demo: boolean;
  created_at: string;
};

export type Profile = {
  id: string;
  role: Role;
  hospital_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  licence_no: string | null;
  licence_body: LicenceBody | null;
  staff_id: string | null;
  hospital_number: string | null;
  verified_status: VerifiedStatus;
  failed_attempts: number;
  consent_at: string | null;
  text_size: "normal" | "large" | "larger";
  high_contrast: boolean;
  speech_rate: number;
  created_at: string;
};

export type StaffRosterRow = {
  id: string;
  hospital_id: string;
  staff_id: string;
  full_name: string;
  role: StaffRole;
  phone: string | null;
  email: string | null;
  licence_body: LicenceBody | null;
  licence_no: string | null;
};

export type PatientRegistryRow = {
  id: string;
  hospital_id: string;
  hospital_number: string;
  full_name: string;
  phone: string;
  age: number | null;
  sex: "M" | "F" | "other" | null;
};

export type VerificationAttempt = {
  id: string;
  hospital_id: string | null;
  identifier: string;
  role: Role;
  failed_attempts: number;
  blocked_at: string | null;
  last_attempt_at: string;
};

export type SignupSession = {
  id: string;
  hospital_id: string | null;
  role: Role;
  full_name: string;
  phone: string;
  email: string | null;
  staff_id: string | null;
  hospital_number: string | null;
  licence_body: LicenceBody | null;
  licence_no: string | null;
  roster_id: string | null;
  registry_id: string | null;
  consent_at: string | null;
  status: "pending_otp" | "completed" | "expired";
  expires_at: string;
};

export type OtpRow = {
  id: string;
  target: string;
  purpose: "signup" | "login";
  code_hash: string;
  signup_session_id: string | null;
  profile_id: string | null;
  attempts: number;
  expires_at: string;
  used_at: string | null;
};

/** Result of verify_identity() in 0003_functions.sql. */
export type VerifyResult =
  | {
      result: "matched";
      phone: string | null;
      email?: string | null;
      full_name: string;
      licence_body?: LicenceBody | null;
      licence_no?: string | null;
      roster_id?: string;
      registry_id?: string;
      existing_profile_id: string | null;
    }
  | { result: "rejected"; failed_attempts: number; reason?: string }
  | { result: "blocked"; failed_attempts: number };

/** Where each role lands after signing in (BottomNav tab sets in src/config/nav.ts). */
export const homeForRole: Record<Role, string> = {
  platform_admin: "/approve-hospitals",
  hospital_admin: "/hospital",
  doctor: "/dashboard",
  pharmacist: "/dashboard",
  nurse: "/dashboard",
  patient: "/home",
};

/** Signup dropdown value for independent patients (no hospital). */
export const NO_HOSPITAL = "none";

/** Required CSV columns for the hospital admin uploads. */
export const staffColumns = ["staff_id", "full_name", "role", "licence_body", "licence_no", "phone", "email"] as const;
export const patientColumns = ["hospital_number", "full_name", "phone", "age", "sex"] as const;
