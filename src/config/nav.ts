/**
 * Bottom navigation tab sets (BUILD_PLAN section 3, "Bottom navigation bar").
 * Labels come from messages under `nav.<labelKey>`. Patient Scan is the raised main action.
 * Stage 0: /forum and /me live in the (patient) group, so they show the patient shell for
 * every role; Stage 1 makes the shell follow the signed-in profile's role.
 */
export type NavRole = "patient" | "staff" | "admin";
export type NavIconName = "home" | "scan" | "ask" | "forum" | "me" | "dashboard" | "patients" | "alerts" | "staff";
export type NavBadge = "redFlags" | "questions" | "overdue";

export type NavTab = {
  href: string;
  labelKey: "home" | "scan" | "ask" | "forum" | "me" | "dashboard" | "patients" | "alerts" | "staff";
  icon: NavIconName;
  /** Patient Scan: the raised primary rounded square in the centre. */
  raised?: boolean;
  /** Which live count this tab shows (red-flag alerts, waiting questions, overdue dose). */
  badge?: NavBadge;
};

export const navTabs: Record<NavRole, NavTab[]> = {
  patient: [
    { href: "/home", labelKey: "home", icon: "home", badge: "overdue" },
    { href: "/scan", labelKey: "scan", icon: "scan", raised: true },
    { href: "/assistant", labelKey: "ask", icon: "ask" },
    { href: "/forum", labelKey: "forum", icon: "forum" },
    { href: "/me", labelKey: "me", icon: "me" },
  ],
  staff: [
    { href: "/dashboard", labelKey: "dashboard", icon: "dashboard" },
    { href: "/patients", labelKey: "patients", icon: "patients" },
    { href: "/alerts", labelKey: "alerts", icon: "alerts", badge: "redFlags" },
    { href: "/forum", labelKey: "forum", icon: "forum", badge: "questions" },
    { href: "/me", labelKey: "me", icon: "me" },
  ],
  admin: [
    { href: "/hospital", labelKey: "dashboard", icon: "dashboard" },
    { href: "/roster", labelKey: "staff", icon: "staff" },
    { href: "/registry", labelKey: "patients", icon: "patients" },
    { href: "/me", labelKey: "me", icon: "me" },
  ],
};

export type NavCounts = Partial<Record<NavBadge, number>>;
