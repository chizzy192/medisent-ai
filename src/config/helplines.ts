/**
 * Crisis helplines shown on the self-harm screen. VERIFY BEFORE DEMO: numbers change; check each
 * one is live before showing it to a real person. Emergency number for Nigeria: 112.
 */
export const EMERGENCY_NUMBER = "112";

export const helplines = [
  { name: "Nigeria Suicide Prevention Initiative", phone: "+2348062106493", hours: "24 hours", note: "Free, confidential" },
  { name: "Mentally Aware Nigeria Initiative (MANI)", phone: "+2348091116264", hours: "24 hours", note: "Counsellors by phone and WhatsApp" },
  { name: "Lagos State Mental Health helpline", phone: "+2349090006463", hours: "24 hours", note: "Lagos" },
] as const;
