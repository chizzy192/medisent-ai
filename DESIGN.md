# Medisent AI — Design

Source of truth: `docs/BUILD_PLAN.md` section 3 v2, **"Clinical precision"**. Visual targets: `docs/mockups/medisent-landing.png` (landing), `docs/mockups/medisent-patient-screens-v3.png` (patient, replaces the older patient image wherever they differ) and `docs/mockups/medisent-staff-screens.png` (staff). The palette, fonts, header rule, logo and button rules are FIXED. Design tools work inside them; suggested changes are listed for the product owner, not applied.

## Direction

Technical, precise and calm, like a well-made medical instrument. Cool neutrals, white cards, one cobalt accent, monospaced numbers for times, doses and IDs. Built for every age, including elderly, low-literacy and low-vision users on low-end Android phones: plain labels, big targets, high contrast, nothing decorative.

## Colour tokens (light)

| Token | Hex | Use |
| --- | --- | --- |
| bg | `#F6F8FA` | App background |
| surface | `#FFFFFF` | Cards, header, bottom bar, inputs |
| surface-2 | `#EEF2F6` | Meter tracks, neutral chips, table row dividers |
| border | `#D9E0E8` | Card and input borders (1px) |
| ink | `#0E1726` | Main text |
| ink-2 | `#44546A` | Secondary text |
| ink-3 | `#5E6E84` | Labels, hints, inactive nav |
| primary | `#1F4FD8` | Buttons (white text), links, active nav, charts, logo mark |
| primary-tint | `#E6EDFC` | Active nav pill, info panels, citation blocks, AI badge |
| success | `#12805C` on `#E3F4EC` | Taken, registered, verified, low risk |
| warning | `#9A4B05` text, `#D97706` dot/bar, `#FDF1DC` fill | Late, overdue, refill soon, medium risk, drug not found |
| danger | `#C81E1E` on `#FDECEC`; solid `#C81E1E` banner | Red flags and high risk only |
| hospital bar | hospital `brand_color` (default `#1D4E89`) | 3px line under the header only |

In code these are Tailwind utilities from `src/app/globals.css`: `bg-bg`, `bg-surface`, `bg-surface-2`, `border-border`, `text-ink`, `text-ink-2`, `text-ink-3`, `bg-primary`, `text-on-primary`, `bg-primary-tint`, `text-success` / `bg-success-tint`, `text-warning` / `bg-warning-dot` / `bg-warning-tint`, `text-danger` / `bg-danger-tint`, `bg-danger-solid` / `text-on-danger`.

## App background (owner rule, 2026-11-19)

Every page carries the dot grid: bg `#F6F8FA` with `radial-gradient(#D3DBE6 1px, transparent 1px)` at 16px spacing, set once on `body` in the root layout. Cards, header, bottom bar, sidebar, inputs and tables stay solid white (`bg-surface`). Dark mode: `#0B1220` with `#1A2538` dots. High-contrast mode (`data-contrast="high"`) and `prefers-contrast: more`: no dots. Hero cards no longer carry their own texture.

## Dark mode

bg `#0B1220`, surface `#111A2B`, surface-2 `#1A2538`, border `#26344A`, ink `#E6EBF2`, ink-2 `#AEB9C8`, ink-3 `#8A97AA`, primary `#6E95FF` (text on it `#0B1220`), primary-tint `#1B2A4D`. Follows the OS; `data-theme="light|dark"` on `<html>` overrides it.

Section 3 gives no dark-mode status colours. The code derives them (success `#5DD3A1` on `#12302A`, warning `#F5B562` on `#33240F`, danger `#FF8A8A` on `#3A1618`; the solid red banner stays `#C81E1E` with white text). They need the owner's approval.

## High-contrast mode

ink `#000`, borders `#5E6E84`, primary `#1A3FB0`, set with `data-contrast="high"` on `<html>`. The toggle ships with the Stage 2 accessibility settings.

## Typography

- **IBM Plex Sans** (400 / 500 / 600) for all UI text, loaded with `next/font/google` including the Vietnamese subset, which carries ẹ ọ ị ụ.
- **IBM Plex Mono** (500) for times (`08:00`), doses, counts, percentages, IDs (`AH-0002`, NAFDAC numbers) and small uppercase section labels.
- Fallback: **Noto Sans**, for stacked tone marks (ẹ̀) and the ṣ / ṅ that Plex Mono lacks. All of ẹ ọ ṣ ị ụ ṅ must render.
- `tabular-nums` only on columns of numbers, never inside a single time.
- Scale: page title 22–26px / 600; card title (medicine name) 19px / 600; body 18px (16px for secondary lines); time on a medicine card 22px mono; section label 12px mono uppercase, 0.04em tracking; never below 12px (bottom-nav labels 13px). Line-height 1.5 for body.
- Medicine name, dose and time are the most readable text on patient screens.
- Large-text mode scales everything 125% / 150% without breaking layouts. Text expands in other languages: no fixed-width buttons, allow wrapping, never clip.

## Shape and spacing

- 4px base; steps 8 / 12 / 16 / 24 / 32.
- Cards: 12px radius, 14–16px padding, 1px border, **no shadows**.
- Buttons: 10px radius, 48px minimum height; tap targets 48×48px minimum.
- Chips: fully rounded, coloured dot plus word.

## Logo

Cobalt rounded square with a white plus, then "Medisent" in Plex Sans 600, then a small mono "AI" badge on primary-tint (`src/components/Logo.tsx`). Never a red cross. The full name "Medisent AI" stays in `src/config/brand.ts`.

## Header rule

White (surface). Logo left with the hospital name under it; language picker right as a compact mono code (`IG ▾`) over a native select; read-aloud button beside it (it wraps to its own row on phones). A 3px bar at the bottom in the hospital's `brand_color` (`#1D4E89` when the hospital has none); primary on public screens with no hospital yet.

## Buttons and status

- One primary (cobalt, white text) button per card; secondary actions are outlined cobalt (`.btn-primary`, `.btn-secondary`).
- Status chips are always dot + word (● Taken, ● 20 min late, ● Upcoming, ● High 78). Colour is never the only signal.
- Red only for red-flag alerts and high risk.
- Numbers, times and IDs always in Plex Mono.
- Charts: cobalt line, dashed grey target line, mono axis labels, a text summary for screen readers.

## Bottom navigation

Phones and tablets (< 1024px): fixed bottom bar, surface background, 1px border-colour top border, 64px + safe-area inset. Icon (24px outline) + always-visible translated label (13px min; on phones the label holds at 13px so words stay whole at 200% text, on wider screens it scales with the text). Active: primary icon and label, primary-tint pill, `aria-current="page"`; inactive ink-3. Patient Scan tab is a raised cobalt rounded square. Never hides on scroll. Desktop (≥ 1024px): staff and admins get a left sidebar (see the staff mockup); patients keep the bottom bar centred at max 480px.

## Components

Button (primary, outline: `.btn-primary`, `.btn-outline`), Card, SectionLabel (`.label-mono`), Meter, EmptyState, TodayRing (sized in rem so it grows with large text), DayTimeline, PillIcon, MedicineCard, AlertBanner, BottomNav + Sidebar, HospitalHeader, Logo, StatusChip, MedicineCard (drug, dose, mono time, status chip, "I took it" primary + "Later" outlined), ReminderSheet (big Taken / Snooze / Missed), MicButton (hold to talk + transcript), AlertBanner (solid red, full width, white call button), ForumPostCard (verified chip with licence body, listen button), VerificationPill (pending / verified / rejected / blocked), OfflineBanner ("● Offline · synced 10:42").

## Landing page (`/`)

Drawn to `docs/mockups/medisent-landing.png`, nine sections (BUILD_PLAN Stage 0): top bar with section links, hero on the dot grid with the mono kicker chip and a 64px headline whose "your language" is primary, the live preview console (`src/components/landing/PreviewConsole.tsx`: language tabs swap the spoken sentence; audio from `public/audio/landing/<code>.mp3` with a browser-voice fallback), four numbered steps on a line, the three-views spec table (three cards below 768px), the drawn feature phone (`FeaturePhone.tsx`; its body and green LCD colours are an illustration, like pill colours, not tokens), four safety cards, the dark CTA band (`.theme-dark` remaps the tokens to the dark values inside it) and the footer with the language codes in mono. The brand name appears in the top bar and footer only.

## Known contrast gaps (owner decisions)

- Success chip text `#12805C` on `#E3F4EC` measures 4.32:1 (AA needs 4.5:1 for 16px text); `#0F6E4F` would pass. Palette is fixed, so this is listed, not changed.
- ink-3 `#5E6E84` on primary-tint `#E6EDFC` is 4.43:1: do not put ink-3 labels on primary-tint. On the dot-grid hero card use ink-2 for the 12px label.

## Hard rules

- Primary buttons with white text; one per card.
- Red only for red-flag alerts and high risk.
- Never colour alone: dot or icon + word.
- No gradients, no glassmorphism, no purple, no emoji in UI, no shadows on cards.
- Every screen has a read-aloud button. Owner exception (2026-11-19): the public landing page hides it below 768px so the sticky top bar stays short; app screens keep it at every size.
- Text must not be clipped when translated.

## Anti-goals

- Generic SaaS landing (centred hero + three feature cards).
- Purple-pink gradients.
- Tiny grey text.
- Icon-only buttons on patient screens.
