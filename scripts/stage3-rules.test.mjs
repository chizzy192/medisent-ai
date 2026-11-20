// Unit tests for the Stage 3 safety layers (pure, no database). Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { detectRedFlag } from "../src/lib/ai/redflags.ts";
import { answerBreaksRules, contextText, ensureCallOffer, isMissedDoseQuestion, systemPrompt } from "../src/lib/ai/answer-rules.ts";

test("red flags: emergencies are caught with informal spellings", () => {
  assert.equal(detectRedFlag("I have chest pain since morning")?.kind, "emergency");
  assert.equal(detectRedFlag("i cant breath well")?.kind, "emergency");
  assert.equal(detectRedFlag("My lips dey swell after the tablet")?.label, "swelling of face, lips or throat");
  assert.equal(detectRedFlag("she fainted twice")?.label, "fainting");
  assert.equal(detectRedFlag("he had a seizure")?.label, "seizure");
  assert.equal(detectRedFlag("bleeding that won't stop")?.label, "heavy bleeding");
  assert.equal(detectRedFlag("rash all over and fever")?.label, "rash with fever");
  assert.equal(detectRedFlag("my sugar is very low, shaking")?.label, "very low or high sugar");
});

test("red flags: self-harm words are a crisis, and win over an emergency in the same sentence", () => {
  assert.equal(detectRedFlag("I want to die")?.kind, "crisis");
  assert.equal(detectRedFlag("chest pain and i want to kill myself")?.kind, "crisis");
  assert.equal(detectRedFlag("Can I take this with food?"), null);
  assert.equal(detectRedFlag("I missed my dose, what now?"), null);
  assert.equal(detectRedFlag("my chest feels fine today"), null);
});

test("prompt states every hard rule", () => {
  const p = systemPrompt();
  for (const must of ["NEVER tell the patient to start, stop", "NEVER diagnose", "missed dose", "PENDING", "grade-6", "call your pharmacist", "red_flag"]) assert.ok(p.includes(must), must);
});

test("context never carries a name or phone and labels pending medicines", () => {
  const text = contextText({
    meds: [
      { name: "Amoxicillin", strength: "500 mg", instruction: "Take 1 capsule 3 times a day, after food, for 5 days.", dose: "1 capsule", status: "verified" },
      { name: "Paracetamol", strength: "500 mg", instruction: null, dose: "2 tablets", status: "pending" },
    ],
    allergies: ["Penicillin"],
    conditions: ["Malaria"],
    forumPosts: [],
  });
  assert.ok(text.includes("PENDING: not checked by a pharmacist yet"));
  assert.ok(text.includes("verified by pharmacist"));
  assert.ok(!/\+234|Folake|Adebayo/.test(text));
});

test("answer guard: dosing changes and diagnoses are rejected, recorded instructions are allowed", () => {
  assert.equal(answerBreaksRules("Stop taking the tablet for two days."), "dosing-change");
  assert.equal(answerBreaksRules("Take two tablets now to catch up."), "dosing-change");
  assert.ok(answerBreaksRules("Take 2 capsules tonight."));
  assert.equal(answerBreaksRules("It sounds like malaria."), "diagnosis");
  assert.equal(answerBreaksRules("You might have an infection, see a doctor."), "diagnosis");
  const ins = "Take 1 capsule 3 times a day, after food, for 5 days.";
  assert.equal(answerBreaksRules(`Your record says: ${ins} Do not take two doses at once. You can also call your pharmacist.`, [ins]), null);
  assert.equal(answerBreaksRules("Yes, your record says to take it after food. You can also call your pharmacist."), null);
});

test("missed-dose questions are recognised and every answer offers the pharmacist", () => {
  assert.ok(isMissedDoseQuestion("I missed my dose, what now?"));
  assert.ok(isMissedDoseQuestion("forgot to take it this morning"));
  assert.ok(!isMissedDoseQuestion("what are the side effects?"));
  assert.ok(/call your pharmacist/i.test(ensureCallOffer("Take it after food.")));
  assert.equal(ensureCallOffer("Yes. You can also call your pharmacist."), "Yes. You can also call your pharmacist.");
});
