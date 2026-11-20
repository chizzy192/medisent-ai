/**
 * Pure matching for interaction rules (no database imports, so it is unit-tested with
 * `node --test`). A medicine becomes a set of tokens: each part of its normalised generic name
 * ("artemether/lumefantrine" → artemether, lumefantrine) plus the drug classes those parts
 * belong to (ibuprofen → nsaid). A rule side matches when it EQUALS one of those tokens.
 * Never a substring match: "amoxicillin" does not match "amoxicillin/clavulanic acid" by
 * accident of spelling, it matches because the part "amoxicillin" is a token.
 */
export type Severity = "major" | "moderate";
export type Rule = { drug_a_generic: string; drug_b_generic: string; severity: Severity; message: string; advice: string };
export type MedRef = { id?: string | null; generic: string | null; name: string };
export type InteractionHit = { severity: Severity; message: string; advice: string; withName: string; pair: [string, string] };

/** Generic name (or part) → the classes a class rule may name. Extend here, never in the rules. */
export const drugClasses: Record<string, string[]> = {
  ibuprofen: ["nsaid"],
  diclofenac: ["nsaid"],
  naproxen: ["nsaid"],
  meloxicam: ["nsaid"],
  piroxicam: ["nsaid"],
  ketorolac: ["nsaid"],
  indomethacin: ["nsaid"],
  lisinopril: ["ace_inhibitor"],
  enalapril: ["ace_inhibitor"],
  ramipril: ["ace_inhibitor"],
  captopril: ["ace_inhibitor"],
  losartan: ["arb"],
  valsartan: ["arb"],
  telmisartan: ["arb"],
  candesartan: ["arb"],
  spironolactone: ["potassium_sparing_diuretic"],
  amiloride: ["potassium_sparing_diuretic"],
  "magnesium trisilicate": ["antacid"],
  "magnesium hydroxide": ["antacid"],
  "aluminium hydroxide": ["antacid"],
  "aluminum hydroxide": ["antacid"],
  "calcium carbonate": ["antacid"],
  antacid: ["antacid"],
  "ferrous sulphate": ["iron"],
  "ferrous sulfate": ["iron"],
  "ferrous fumarate": ["iron"],
  "ferrous gluconate": ["iron"],
  "glyceryl trinitrate": ["nitrate"],
  nitroglycerin: ["nitrate"],
  "isosorbide dinitrate": ["nitrate"],
  "isosorbide mononitrate": ["nitrate"],
  isosorbide: ["nitrate"],
  simvastatin: ["statin"],
  atorvastatin: ["statin"],
  rosuvastatin: ["statin"],
  pravastatin: ["statin"],
  warfarin: ["anticoagulant"],
  rivaroxaban: ["anticoagulant"],
  glibenclamide: ["sulfonylurea"],
  gliclazide: ["sulfonylurea"],
  glimepiride: ["sulfonylurea"],
  clarithromycin: ["macrolide"],
  azithromycin: ["macrolide"],
  erythromycin: ["macrolide"],
  ciprofloxacin: ["fluoroquinolone"],
  levofloxacin: ["fluoroquinolone"],
};

/** Lowercase, trim, collapse spaces, drop punctuation other than the separators we split on. */
export function normalise(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9_/+,\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "artemether/lumefantrine" → ["artemether", "lumefantrine"]; "amoxicillin/clavulanic acid" → both parts. */
export function parts(generic: string | null | undefined): string[] {
  return normalise(generic)
    .split(/\s*(?:\/|\+|,|\band\b|\bwith\b)\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Every token a medicine answers to: its generic parts, their classes, and the name when there is no generic. */
export function tokensFor(med: MedRef): Set<string> {
  const out = new Set<string>();
  const generic = parts(med.generic);
  const base = generic.length ? generic : parts(med.name);
  for (const p of base) {
    out.add(p);
    for (const c of drugClasses[p] ?? []) out.add(c);
    // "ferrous sulphate 200 mg" style leftovers: also try the first two words.
    const words = p.split(" ");
    if (words.length > 2) {
      const two = words.slice(0, 2).join(" ");
      if (drugClasses[two]) {
        out.add(two);
        for (const c of drugClasses[two]) out.add(c);
      }
    }
  }
  return out;
}

/** A rule side ("warfarin", "nsaid", "artemether/lumefantrine") matches when every one of its parts is a token of the medicine. */
export function sideMatches(side: string, med: MedRef): boolean {
  const need = parts(side);
  if (!need.length) return false;
  const have = tokensFor(med);
  return need.every((n) => have.has(n));
}

export function matchRules(candidate: MedRef, others: MedRef[], rules: Rule[]): InteractionHit[] {
  const hits: InteractionHit[] = [];
  for (const other of others) {
    if (candidate.id && other.id && candidate.id === other.id) continue;
    for (const r of rules) {
      const ab = sideMatches(r.drug_a_generic, candidate) && sideMatches(r.drug_b_generic, other);
      const ba = sideMatches(r.drug_b_generic, candidate) && sideMatches(r.drug_a_generic, other);
      if (ab || ba) hits.push({ severity: r.severity, message: r.message, advice: r.advice, withName: other.name, pair: [r.drug_a_generic, r.drug_b_generic] });
    }
  }
  const seen = new Set<string>();
  return hits
    .filter((h) => {
      const key = `${h.withName}|${h.pair.join("+")}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => Number(b.severity === "major") - Number(a.severity === "major"));
}
