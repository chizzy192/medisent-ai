"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { navTabs, type NavCounts, type NavIconName, type NavRole, type NavTab } from "@/config/nav";
import {
  AskIcon,
  BellIcon,
  DashboardIcon,
  ForumIcon,
  HomeIcon,
  PatientsIcon,
  ScanIcon,
  StaffIcon,
  UserIcon,
} from "./icons";

const icons: Record<NavIconName, typeof HomeIcon> = {
  home: HomeIcon,
  scan: ScanIcon,
  ask: AskIcon,
  forum: ForumIcon,
  me: UserIcon,
  dashboard: DashboardIcon,
  patients: PatientsIcon,
  alerts: BellIcon,
  staff: StaffIcon,
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Hide only while the on-screen keyboard is open: the visual viewport loses a lot of height at
 * scale 1. Pinch-zoom also shrinks it, so the height is unscaled first (low-vision users
 * pinch-zoom constantly and must keep the bar).
 */
function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setOpen(window.innerHeight - vv.height * vv.scale > 150);
    vv.addEventListener("resize", update);
    return () => vv.removeEventListener("resize", update);
  }, []);
  return open;
}

function Badge({ tab, counts }: { tab: NavTab; counts: NavCounts }) {
  const t = useTranslations("nav");
  if (!tab.badge) return null;
  const count = counts[tab.badge] ?? 0;
  if (count <= 0) return null;
  if (tab.badge === "overdue") {
    return (
      <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-surface bg-warning-dot">
        <span className="sr-only">{t("badgeOverdue")}</span>
      </span>
    );
  }
  const tone = tab.badge === "redFlags" ? "bg-danger-solid text-on-danger" : "bg-primary text-on-primary";
  return (
    <span
      className={`absolute -top-1.5 -right-2.5 min-w-5 rounded-full px-1 text-center font-mono text-[0.75rem] leading-5 ${tone}`}
    >
      {count}
      <span className="sr-only"> {t(tab.badge === "redFlags" ? "badgeRedFlags" : "badgeQuestions", { count })}</span>
    </span>
  );
}

/**
 * Mobile-app style bottom bar (section 3). Every tab is icon + always-visible label (13px),
 * 48×48 minimum, active = primary with a primary-tint pill and aria-current. Fixed to the
 * bottom with safe-area padding; never hides on scroll, only while the keyboard is open.
 * Staff and admins switch to the Sidebar on desktop (>= 1024px); patients keep the bar,
 * centred at 480px.
 */
export function BottomNav({ role, counts = {} }: { role: NavRole; counts?: NavCounts }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const keyboardOpen = useKeyboardOpen();
  const tabs = navTabs[role];
  const navRef = useRef<HTMLElement>(null);

  // The bar grows with large text and long translations; the page padding follows its real height
  // through --bottom-nav-h (AppShell reads it).
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => root.style.setProperty("--bottom-nav-h", `${nav.offsetHeight}px`));
    observer.observe(nav);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--bottom-nav-h");
    };
  }, []);

  return (
    <nav
      ref={navRef}
      aria-label={t("main")}
      hidden={keyboardOpen}
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] ${
        role === "patient" ? "lg:mx-auto lg:max-w-[480px] lg:rounded-t-card lg:border-x" : "lg:hidden"
      }`}
    >
      <ul className="flex min-h-16 items-stretch">
        {tabs.map((tab) => {
          const Icon = icons[tab.icon];
          const active = isActive(pathname, tab.href);
          return (
            <li key={tab.href} className="flex min-w-0 flex-[1_1_auto]">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-[clamp(13px,0.8125rem,1rem)] leading-[1.3] ${
                  active ? "font-semibold text-primary" : "text-ink-3 hover:text-ink"
                }`}
              >
                {tab.raised ? (
                  <span
                    className={`-mt-5 flex size-12 items-center justify-center rounded-[14px] bg-primary text-on-primary ring-4 ring-surface ${
                      active ? "outline-2 outline-offset-2 outline-primary" : ""
                    }`}
                  >
                    <Icon size={24} />
                  </span>
                ) : (
                  <span
                    className={`relative flex h-8 w-14 items-center justify-center rounded-full ${active ? "bg-primary-tint" : ""}`}
                  >
                    <Icon size={24} />
                    <Badge tab={tab} counts={counts} />
                  </span>
                )}
                {/* The label scales with the text from 13px up to 16px; tabs size to their label so words stay whole. */}
                <span className="max-w-full text-center leading-tight [overflow-wrap:break-word]">{t(tab.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Desktop (>= 1024px) left sidebar for staff and admins, same tabs as the bottom bar. */
export function Sidebar({ role, counts = {} }: { role: Exclude<NavRole, "patient">; counts?: NavCounts }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <nav aria-label={t("main")} className="sticky top-0 hidden max-h-screen w-64 shrink-0 self-start overflow-y-auto border-r border-border bg-surface p-3 lg:block">
      <ul className="space-y-1">
        {navTabs[role].map((tab) => {
          const Icon = icons[tab.icon];
          const active = isActive(pathname, tab.href);
          const count = tab.badge ? (counts[tab.badge] ?? 0) : 0;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 items-center gap-3 rounded-button px-3 text-base ${
                  active ? "bg-primary-tint font-semibold text-primary" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                }`}
              >
                <Icon size={22} />
                <span className="min-w-0 flex-1 [overflow-wrap:break-word]">{t(tab.labelKey)}</span>
                {count > 0 && (
                  <span
                    className={`rounded-full px-2 font-mono text-sm ${
                      tab.badge === "redFlags" ? "bg-danger-tint text-danger" : "bg-surface-2 text-ink-2"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
