# Medisent AI — Design

Source of truth: `docs/BUILD_PLAN.md` section 3. This palette, the fonts, the header rule and the button colours are FIXED. Design tools must work inside them. Suggested changes to them are listed for the product owner, not applied.

## Direction

Warm, calm, clinical-but-human. Cream backgrounds, white cards, denim for actions, browns for brand and text. Built for elderly, low-literacy and low-vision users on low-end Android phones, in bright sunlight, often one-handed, with interrupted network.

## Colour tokens (light)

| Token | Hex | Use |
| --- | --- | --- |
| cream-light | `#FBF6EE` | Main background, header background |
| white (`surface` in code) | `#FFFFFF` | Cards, inputs, modals |
| cream | `#F5EDE0` | Section bands, side panels |
| sand | `#EAD9C2` | Card borders, reminder pill fill, selected rows |
| tan | `#CDB497` | Dividers, input borders |
| cocoa | `#6F4A2E` | Logo, page titles, brand marks (NOT buttons) |
| chocolate | `#4A2F1D` | Headings, header text |
| espresso | `#2A1B12` | Body text |
| mocha | `#7A6352` | Labels, timestamps, hints |
| caramel | `#A9743F` | Small icons and progress bars only, never text |
| denim | `#2F5D8A` | Primary buttons (white text), links, header accent bar, forum tags |
| denim-tint | `#DCE8F3` | Verified post cards, info panels, selected tab |
| ochre | `#C8901A` | Overdue reminder fill only (espresso text) |
| green | `#3D7A4F` | Taken, verified badge |
| alert | `#C62828` | Red-flag banner only |

In code the tokens are Tailwind utilities defined in `src/app/globals.css` (`bg-cream-light`, `text-cocoa`, `border-sand`, `bg-denim`, `text-on-denim`, …). The "white" token is named `surface` so dark mode can remap it.

## Dark mode

Background `#1C130D`, surface `#2A1B12`, text `#F5EDE0`, primary (cocoa role) `#B98A5E`, blue (denim role) `#7FA7CF`. In dark mode, text on denim buttons is `#1C130D` (`on-denim` token) to keep contrast. Follows the OS setting; `data-theme="light|dark"` on `<html>` overrides it.

High-contrast mode (Stage 2): near-black background, cream text, ochre accents.

## Typography

- Headings: **Young Serif** (400).
- Body: **Atkinson Hyperlegible** (400, 700).
- Fallback: **Noto Sans** / **Noto Serif**. Young Serif and Atkinson have no glyphs for ẹ ọ ị ụ, so Noto supplies those letters per character. All of ẹ ọ ṣ ị ụ ṅ must render.
- Loaded with `next/font/google`.
- Body 18px minimum (`text-base` = 18px); line-height 1.5 for body.
- On patient screens, the medicine name and dose are the largest text.
- Scale: 13px (bottom-nav labels only) · 16 · 18 · 20 · 24 · 30 · 36 · 48 · 60.
- Three user text sizes (Stage 2). Text expands in other languages: no fixed-width buttons, allow wrapping, never clip.

## Spacing and shape

- 4px base; steps 8 / 12 / 16 / 24 / 32.
- Cards: 16px padding, 14px radius, 1px sand border.
- Buttons: 12px radius, 48px minimum height; tap targets 48×48px minimum.

## Header rule

cream-light background, cocoa "Medisent AI" wordmark in Young Serif, chocolate hospital name, 3px bottom bar in the hospital's `brand_color` (denim when there is none). Language switcher and read-aloud button live in the header.

## Button rule

Buttons are denim with white text. Cocoa is never a button colour. Red is never a button colour (except the call button inside the red-flag banner).

## Bottom navigation

Mobile (< 1024px): fixed bottom bar, white, 1px sand top border, 64px + safe-area inset. Icon (24px outline) + always-visible translated label (13px min). Active: denim icon + label, denim-tint pill, `aria-current="page"`. Inactive: mocha. Never hides on scroll. Desktop (≥ 1024px): staff and admins get a left sidebar; patients keep the bottom bar centred at max 480px.

## Components

BottomNav, HospitalHeader, MedicineCard (drug, dose, next time, play button), ReminderSheet (big Taken / Snooze / Missed), MicButton (hold to talk + transcript), AlertBanner (full width, call button), ForumPostCard (denim tag, green verified badge, listen button), VerificationPill (pending / verified / rejected / blocked), OfflineBanner ("Offline — last synced 10:42").

## Hard rules

- Denim buttons with white text.
- Red only for red-flag alerts.
- Never colour alone for meaning: always icon + word (✓ Taken, ⏰ Due, ⚠ Alert).
- No gradients, no glassmorphism, no purple.
- Every screen has a read-aloud button.
- Text must not be clipped when translated.
- Motion only for the mic listening pulse and the dose "Taken" confirmation; respect reduced motion.

## Anti-goals

- Generic SaaS landing (centred hero + three feature cards).
- Purple-pink gradients.
- Tiny grey text.
- Icon-only buttons on patient screens.
