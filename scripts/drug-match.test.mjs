// Unit tests for the interaction matcher (pure, no database). Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { drugClasses, matchRules, parts, sideMatches, tokensFor } from "../src/lib/drug-match.ts";

const rules = [
  { drug_a_generic: "warfarin", drug_b_generic: "aspirin", severity: "major", message: "bleed", advice: "ask" },
  { drug_a_generic: "warfarin", drug_b_generic: "nsaid", severity: "major", message: "bleed", advice: "ask" },
  { drug_a_generic: "ace_inhibitor", drug_b_generic: "nsaid", severity: "moderate", message: "kidneys", advice: "paracetamol" },
  { drug_a_generic: "ciprofloxacin", drug_b_generic: "antacid", severity: "moderate", message: "absorb", advice: "2 hours" },
  { drug_a_generic: "artemether/lumefantrine", drug_b_generic: "clarithromycin", severity: "major", message: "heart", advice: "no" },
  { drug_a_generic: "amoxicillin", drug_b_generic: "methotrexate", severity: "major", message: "toxic", advice: "no" },
];
const med = (name, generic = name.toLowerCase(), id = name) => ({ id, name, generic });

test("combination generics split into parts", () => {
  assert.deepEqual(parts("Artemether/Lumefantrine"), ["artemether", "lumefantrine"]);
  assert.deepEqual(parts("amoxicillin/clavulanic acid"), ["amoxicillin", "clavulanic acid"]);
  assert.deepEqual(parts("Sulfadoxine + Pyrimethamine"), ["sulfadoxine", "pyrimethamine"]);
});

test("classes come from the mapping, not from words in the name", () => {
  assert.ok(tokensFor(med("Ibuprofen")).has("nsaid"));
  assert.ok(tokensFor(med("Magnesium trisilicate (antacid)", "magnesium trisilicate")).has("antacid"));
  assert.ok(drugClasses.lisinopril.includes("ace_inhibitor"));
  assert.ok(!tokensFor(med("Paracetamol")).has("nsaid"));
});

test("warfarin + aspirin fires (major, either order)", () => {
  const w = med("Warfarin");
  const a = med("Aspirin", "acetylsalicylic acid");
  // the seeded formulary names aspirin's generic "acetylsalicylic acid": the printed name must still match
  const hitsByName = matchRules(med("Aspirin", null), [w], rules);
  assert.equal(hitsByName.length, 1);
  assert.equal(hitsByName[0].severity, "major");
  assert.equal(matchRules(w, [med("Aspirin", "aspirin")], rules).length, 1);
  assert.equal(matchRules(a, [w], rules).length, 0, "generic 'acetylsalicylic acid' alone is not the token 'aspirin'");
});

test("ibuprofen + lisinopril fires through the nsaid / ace_inhibitor classes", () => {
  const hits = matchRules(med("Ibuprofen"), [med("Lisinopril")], rules);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].severity, "moderate");
  assert.equal(hits[0].withName, "Lisinopril");
  assert.equal(matchRules(med("Diclofenac"), [med("Enalapril")], rules).length, 1);
});

test("no false positive for unrelated drugs with similar names", () => {
  // "amoxicillin" rule must not fire for a different drug whose name merely contains letters in common
  assert.equal(matchRules(med("Amoxapine"), [med("Methotrexate")], rules).length, 0);
  // "warfarin" is not a substring match for anything else
  assert.equal(matchRules(med("Warfaring Cream", "zinc oxide"), [med("Aspirin", "aspirin")], rules).length, 0);
  // a rule naming a combination needs BOTH parts
  assert.equal(matchRules(med("Artemether only", "artemether"), [med("Clarithromycin")], rules).length, 0);
  assert.equal(matchRules(med("Coartem", "artemether/lumefantrine"), [med("Clarithromycin")], rules).length, 1);
  // ciprofloxacin + paracetamol: nothing
  assert.equal(matchRules(med("Ciprofloxacin"), [med("Paracetamol")], rules).length, 0);
});

test("a medicine never interacts with its own prescription row", () => {
  const w = med("Warfarin", "warfarin", "row-1");
  assert.equal(matchRules({ ...w }, [w], [{ drug_a_generic: "warfarin", drug_b_generic: "warfarin", severity: "major", message: "x", advice: "y" }]).length, 0);
});

test("sideMatches is exact on tokens", () => {
  assert.ok(sideMatches("nsaid", med("Naproxen")));
  assert.ok(!sideMatches("nsaid", med("Nsaidol", "nsaidol")));
  assert.ok(sideMatches("antacid", med("Aluminium hydroxide")));
});
