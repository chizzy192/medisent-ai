---
version: 1
slug: "src-app-public-page-tsx"
primary_target: "src/app/(public)/page.tsx"
related_targets: []
---

# Landing page (`/`)

Mode: Persuade. Code-led (no image generation). Visitors: competition judges now, hospital teams and patients next. Actions: Sign in and Register your hospital, equal weight (owner's choice). Proof: none real; every example is labelled and fictional. Constraints: BUILD_PLAN section 3 v2 "Clinical precision" is fixed and pinned by docs/mockups/; every string translated (5 locales); read-aloud; 360px and 200% text.

## Direction contract

THESIS: The page is one patient's day of doses, drawn in the app's own components. Each hour proves one claim where it matters. It refuses the split hero and the row of equal feature cards.

OWN-WORLD: Clinical precision, as in the mockups: cool #F6F8FA ground, white 1px-bordered 12px cards with no shadows, one cobalt accent, IBM Plex Sans with Plex Mono for every time, dose and label. Dot-plus-word status chips. A thin border-grey rail with cobalt dots. Red appears once, as the real red-flag alert block.

STORY: You hear your medicine in your language; reminders reach basic phones; family hears about a missed dose; danger words go to people, not AI; only verified hospital staff and patients get in. Then: sign in or register.

FIRST VIEWPORT: White header with the cobalt-plus logo. Then the tagline as h1, the intro, two equal cobalt buttons and the verified note in one column. The day starts below; on desktop the 08:00 medicine card, with its mono time and Listen button, is in view; on phones the day title is in view and the 08:00 card starts at the fold.

FORM: A day of doses, position 3 of 7 on the ordered list, seed:2536bf06fd9c7b0b. Signature interaction: "Listen in <language>" on the 08:00 card speaks it in the chosen language, or says plainly that the device has no such voice.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
