---
version: 1
slug: "src-app-public-page-tsx"
primary_target: "src/app/(public)/page.tsx"
related_targets: ["src/components/landing/TopBar.tsx", "src/components/landing/PreviewConsole.tsx", "src/components/landing/FeaturePhone.tsx"]
---

# Landing page (`/`)

Mode: Persuade. Code-led (no image generation). Visitors: competition judges now, hospital teams and patients next. Primary action: "Try the demo" (primary); secondary: "Register your hospital" (outline); "Sign in" in the top bar. Proof: none real; every example is labelled fictional. Constraints: BUILD_PLAN section 3 v2 "Clinical precision" is fixed; the owner's comp `docs/mockups/medisent-landing.png` and the nine sections in BUILD_PLAN Stage 0 are the measured target; every string translated (5 locales); read-aloud button in the top bar; 360px and 200% text; light and dark mode.

## Direction contract

THESIS: One prescription, five languages, shown live. The hero makes the claim; the live preview console directly under it proves it in the app's own components before the visitor scrolls. The rest of the page is a spec sheet: numbered steps on a line, a three-column table, a drawn basic phone, four safety cards, a dark CTA band.

OWN-WORLD: Clinical precision, as in the comp: cool #F6F8FA ground with the dot grid on the hero only, white 1px-bordered 12px cards with no shadows, one cobalt accent, IBM Plex Sans with Plex Mono for every time, dose, ID, code and small uppercase label. Dot-plus-word status chips. Red appears nowhere on this page.

STORY: Scan a label; hear it in Igbo, Yoruba, Hausa, Pidgin or English; get a reminder on any phone, even a basic one; staff see who needs help; the AI never decides. Then: try the demo or register your hospital.

FIRST VIEWPORT: White top bar (logo, section links, language picker, read-aloud, Sign in, Try the demo). Mono kicker chip, 64px headline with "your language" in cobalt, one-line lead, two buttons, and the top of the live preview console (language tabs EN · IG · YO · HA · PCM) in view at 1440×900. On phones the headline, lead and both buttons are in view; the console starts at the fold.

FORM: Comp-led from `docs/mockups/medisent-landing.png` (owner-approved). Signature interaction: the language tabs swap the spoken sentence and play its audio (pre-generated file, browser-voice fallback, plain message when there is no voice); the waveform bars move only while audio plays.

FINISH: critique and audit on the landing page; all P0 and P1 fixed; DESIGN.md matches BUILD_PLAN section 3.
