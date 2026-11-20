/**
 * Red-flag layer (BUILD_PLAN section 5): plain keyword rules that run BEFORE any model call and
 * never depend on one. Pure, English only, with common informal spellings. Two kinds:
 * "emergency" → the red-flag screen (call, nearest clinics, staff alert, caregiver SMS);
 * "crisis" → the helpline screen (self-harm words) + urgent staff alert.
 */
export type RedFlagKind = "emergency" | "crisis";
export type RedFlag = { kind: RedFlagKind; matched: string[]; label: string };

type Rule = { label: string; kind: RedFlagKind; patterns: RegExp[] };

const rules: Rule[] = [
  { label: "chest pain", kind: "emergency", patterns: [/\bchest\s*(pain|pains|tight|tightness|pressure|hurt|hurts|burning)\b/, /\bpain\s+in\s+(my|the)\s+chest\b/, /\bheart\s+(pain|attack)\b/] },
  { label: "trouble breathing", kind: "emergency", patterns: [/\b(can'?t|cannot|can not|hard to|difficult to|struggling to|unable to)\s+breath/, /\bbreath(ing)?\s+(problem|trouble|hard|difficult)/, /\bshort(ness)?\s+of\s+breath\b/, /\bgasping\b/, /\bno\s+air\b/] },
  { label: "swelling of face, lips or throat", kind: "emergency", patterns: [/\b(face|lip|lips|tongue|throat|eye|eyes)\s+(is|are|dey|don)?\s*(swell|swollen|swelling|swelled)/, /\bswell\w*\s+(of\s+)?(my\s+|the\s+)?(face|lip|lips|tongue|throat)\b/, /\bthroat\s+(is\s+)?clos/] },
  { label: "fainting", kind: "emergency", patterns: [/\bfaint(ed|ing|s)?\b/, /\bpass(ed)?\s+out\b/, /\bcollaps(e|ed|ing)\b/, /\bblack(ed)?\s+out\b/, /\bunconscious\b/] },
  { label: "seizure", kind: "emergency", patterns: [/\bseizure(s)?\b/, /\bconvuls/, /\bfit(s)?\b/, /\bshaking\s+all\s+over\b/, /\bepilep/] },
  { label: "heavy bleeding", kind: "emergency", patterns: [/\b(heavy|severe|serious|plenty|too much|a lot of|lots of|won'?t stop|will not stop|can'?t stop)\s+(of\s+)?bleed/, /\bbleed(ing)?\s+(heavily|a lot|plenty|too much|won'?t stop|will not stop|that won'?t stop)/, /\bvomit(ing|ed)?\s+blood\b/, /\bblood\s+in\s+(my\s+)?(stool|urine|vomit|poo)\b/, /\bcoughing\s+(up\s+)?blood\b/] },
  { label: "rash with fever", kind: "emergency", patterns: [/\brash\b[^.]{0,40}\bfever\b/, /\bfever\b[^.]{0,40}\brash\b/, /\bskin\s+(is\s+)?peel/, /\bblister(s|ing)?\b[^.]{0,30}\b(mouth|lips|eyes)\b/] },
  { label: "very low or high sugar", kind: "emergency", patterns: [/\bsugar\s+(is\s+)?(very|too)\s+(low|high)\b/, /\b(very|too)\s+(low|high)\s+(blood\s+)?sugar\b/, /\b(shaking|sweating|confused)\b[^.]{0,40}\b(sugar|insulin|glibenclamide|metformin)\b/, /\bhypo(glyc\w*)?\b/, /\bsugar\s+(reading|level)\s+(is\s+)?(below|under)\s+\d/] },
  { label: "stroke signs", kind: "emergency", patterns: [/\b(face|mouth)\s+(is\s+)?droop/, /\b(can'?t|cannot)\s+(move|feel|lift)\s+(my\s+)?(arm|leg|side)\b/, /\bslurred\s+speech\b/, /\bone\s+side\s+(of\s+my\s+body\s+)?(is\s+)?(weak|numb|dead)\b/] },
  { label: "self-harm words", kind: "crisis", patterns: [/\bsuicid/, /\bkill\s+myself\b/, /\bend\s+(my|it\s+all|everything)\b/, /\b(want|wish)\s+to\s+die\b/, /\bdon'?t\s+want\s+to\s+(live|be\s+alive|wake\s+up)\b/, /\bhurt(ing)?\s+myself\b/, /\btake\s+my\s+(own\s+)?life\b/, /\bno\s+reason\s+to\s+live\b/, /\bbetter\s+off\s+dead\b/, /\boverdose\s+(myself|on\s+purpose)\b/] },
];

export function normaliseText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9'\s.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The first matching rule, crisis before emergency (a self-harm sentence must never show the clinic map instead). */
export function detectRedFlag(text: string): RedFlag | null {
  const t = normaliseText(text ?? "");
  if (!t) return null;
  const hits = rules.filter((r) => r.patterns.some((p) => p.test(t)));
  if (!hits.length) return null;
  const crisis = hits.find((h) => h.kind === "crisis");
  const pick = crisis ?? hits[0];
  return { kind: pick.kind, label: pick.label, matched: hits.map((h) => h.label) };
}
