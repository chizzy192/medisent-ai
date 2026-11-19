# Stage 6 follow-up tasks

Tasks raised in earlier stages, to do in Stage 6 (Polish). Kept separate from `BUILD_PLAN.md`.

- [ ] **Remove the dev-only letter-check line** on the landing page: delete `DevLetterCheck` in `src/app/(public)/page.tsx` and the `landing.letterCheck` key in all five `messages/*.json`, once native speakers confirm ẹ ọ ṣ ị ụ ṅ render correctly. (Raised in Stage 0; it already shows only when `NODE_ENV !== "production"`.)
- [ ] **Add "Try the demo"** under the two landing actions as a text link to the demo role picker (BUILD_PLAN Stage 6), plus the "Demo mode — fictional data" ribbon. (Raised by the Stage 0 critique.)
