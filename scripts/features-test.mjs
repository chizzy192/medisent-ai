// Features test: drug interaction warnings + finish-your-course tracker. Needs the dev server,
// migrations through 0011 and seed.sql (Aisha mid-course on Amoxicillin, Musa at risk on
// Artemether-lumefantrine, Yusuf on warfarin + aspirin). Run: node scripts/features-test.mjs http://localhost:3000
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = "test-output/features";
mkdirSync(OUT, { recursive: true });
const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const REST = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`;
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };
const rest = async (path, init = {}) => { const r = await fetch(REST + path, { headers: H, ...init }); const body = await r.text(); if (!r.ok) throw new Error(`${path}: ${r.status} ${body.slice(0, 300)}`); return body ? JSON.parse(body) : null; };

// Guard: migration 0011 applied?
try { await rest("interactions?select=drug_a_generic,severity&limit=1"); } catch (e) { console.error("Migration 0011 is not applied (interactions.drug_a_generic missing). Run supabase/migrations/0011_interactions_courses.sql and seed.sql first.\n" + e.message); process.exit(2); }

const YUSUF = "c0000000-0000-4000-8000-000000000308";
// Reset anything a previous run dispensed for Yusuf (ibuprofen) so the run is repeatable.
const old = await rest(`prescriptions?select=id&patient_id=eq.${YUSUF}&drug_name=eq.Ibuprofen`);
for (const p of old) {
  await rest(`dose_logs?reminder_id=in.(${(await rest(`reminders?select=id&prescription_id=eq.${p.id}`)).map((r) => r.id).join(",") || "00000000-0000-0000-0000-000000000000"})`, { method: "DELETE" });
  await rest(`reminders?prescription_id=eq.${p.id}`, { method: "DELETE" });
  await rest(`refills?prescription_id=eq.${p.id}`, { method: "DELETE" });
  await rest(`alerts?prescription_id=eq.${p.id}`, { method: "DELETE" });
  await rest(`prescriptions?id=eq.${p.id}`, { method: "DELETE" });
}
const auditBefore = (await rest("audit_log?select=id&order=id.desc&limit=1"))[0]?.id ?? 0;

const port = 9700 + Math.floor(Math.random() * 200);
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--disable-gpu", "--no-first-run", `--remote-debugging-port=${port}`, `--user-data-dir=${process.env.TEMP}/cdp-ft-${port}`, "--window-size=1200,900", "about:blank"]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 40 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {} if (!target) await wait(250); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let mid = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise((r) => { pending.set(++mid, r); ws.send(JSON.stringify({ id: mid, method, params })); });
await send("Page.enable");
const ev = async (x) => (await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true })).result?.value;
const goto = async (p) => { await send("Page.navigate", { url: BASE + p }); await wait(2000); };
const text = () => ev("document.body.innerText");
const setV = (sel, v) => ev(`(()=>{const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return "missing"; const proto = el.tagName==="SELECT"?HTMLSelectElement.prototype:el.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,"value").set.call(el,${JSON.stringify(v)}); el.dispatchEvent(new Event("input",{bubbles:true})); el.dispatchEvent(new Event("change",{bubbles:true})); return "ok";})()`);
const click = (sel) => ev(`(()=>{const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return "missing"; el.click(); return "ok";})()`);
async function waitFor(substr, timeout = 30000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if ((await text()).includes(substr)) return; await wait(500); } throw new Error(`timeout waiting for "${substr}"\n${(await text()).slice(0, 800)}`); }
async function waitOption(name, timeout = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) { if (await ev(`(document.querySelector('[data-testid="drug-option"]')?.innerText ?? "").includes(${JSON.stringify(name)})`)) return; await wait(300); }
  throw new Error(`timeout waiting for the "${name}" option`);
}
async function waitSel(sel, timeout = 30000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if (await ev(`!!document.querySelector(${JSON.stringify(sel)})`)) return; await wait(400); } throw new Error(`timeout waiting for ${sel}`); }
async function shot(name) { const s = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(s.data, "base64")); }
const results = [];
const step = async (name, fn) => { try { await fn(); results.push(`PASS ${name}`); console.log("PASS", name); } catch (e) { results.push(`FAIL ${name}: ${e.message}`); console.log("FAIL", name, e.message); } };
async function login(phone, home) {
  await send("Network.clearBrowserCookies"); await goto("/login"); await waitSel("#identifier"); await setV("#identifier", phone); await click('button[name="intent"][value="start"]');
  await waitSel("#code"); await setV("#code", "123456"); await click('button[name="intent"][value="confirm"]');
  const t0 = Date.now(); while (Date.now() - t0 < 30000) { if ((await ev("location.pathname")) === home) return; await wait(400); }
  throw new Error(`login as ${phone} did not reach ${home}, at ${await ev("location.pathname")}`);
}
// Same definition as src/lib/course.ts: finished (not stopped early) with at most 1 missed dose.
async function expectedCompletedPct() {
  const lagosToday = new Date(Date.now() + 3600e3).toISOString().slice(0, 10);
  const rx = await rest("prescriptions?select=id,started_on,duration_days,stopped_early_at&course_required=eq.true&duration_days=not.is.null&status=neq.rejected&hospital_id=eq.a0000000-0000-4000-8000-000000000001");
  const ids = rx.map((r) => r.id);
  const rems = ids.length ? await rest(`reminders?select=id,prescription_id,time_of_day,active&prescription_id=in.(${ids.join(",")})`) : [];
  const logs = rems.length ? await rest(`dose_logs?select=reminder_id,scheduled_at,status&reminder_id=in.(${rems.map((r) => r.id).join(",")})`) : [];
  let finished = 0, completed = 0;
  for (const r of rx) {
    const end = new Date(`${r.started_on}T00:00:00+01:00`); end.setUTCDate(end.getUTCDate() + r.duration_days - 1);
    const endsOn = new Date(end.getTime() + 3600e3).toISOString().slice(0, 10);
    const isFinished = lagosToday > endsOn || Boolean(r.stopped_early_at);
    if (!isFinished) continue;
    finished++;
    const myRems = rems.filter((x) => x.prescription_id === r.id && x.active);
    let missed = 0;
    for (let d = 0; d < r.duration_days; d++) {
      const day = new Date(`${r.started_on}T00:00:00+01:00`); day.setUTCDate(day.getUTCDate() + d);
      const date = new Date(day.getTime() + 3600e3).toISOString().slice(0, 10);
      if (date > lagosToday) break;
      for (const m of myRems) {
        const at = new Date(`${date}T${m.time_of_day.slice(0, 5)}:00+01:00`).getTime();
        const log = logs.find((l) => l.reminder_id === m.id && new Date(l.scheduled_at).getTime() === at);
        if (log?.status === "missed" || (!log && date < lagosToday && at < Date.now() - 7200e3)) missed++;
      }
    }
    if (!r.stopped_early_at && missed <= 1) completed++;
  }
  return finished ? Math.round((completed / finished) * 100) : null;
}

// ---------- B. finish-your-course
await step("B1 Aisha (on track): Home shows the course card, Day 3 of 5, Don't stop early", async () => {
  await login("08000000306", "/home"); await waitSel('[data-testid="course-card"]'); await shot("B1-aisha-home");
  const t = await text(); if (!t.includes("Day 3 of 5")) throw new Error("day missing: " + t.slice(0, 400)); if (!t.includes("Don't stop early")) throw new Error("sentence missing"); if (!t.includes("On track")) throw new Error("not on track");
});
await step("B2 Musa (at risk): course card amber with missed doses; Meds offers 'I stopped early'", async () => {
  await login("08000000303", "/home"); await waitSel('[data-testid="course-card"]'); await shot("B2-musa-home");
  const t = await text(); if (!t.includes("At risk")) throw new Error("not at risk: " + t.slice(0, 400)); if (!/\d doses? missed/.test(t)) throw new Error("missed note missing");
  await goto("/meds"); await waitFor("I stopped taking this early");
});
await step("B3 pharmacist dashboard: Courses completed %, Courses at risk lists Musa, Interaction alerts count", async () => {
  await login("08000000104", "/dashboard"); await waitSel('[data-testid="courses-at-risk"]'); await shot("B3-dashboard");
  const t = await text(); if (!t.includes("Musa Abdullahi")) throw new Error("Musa not in courses at risk"); if (!t.includes("Courses completed")) throw new Error("stat missing"); if (!t.includes("Interaction alerts")) throw new Error("interaction stat missing");
  const pct = await ev(`[...document.querySelectorAll("li")].find(l => l.innerText.includes("Courses completed"))?.innerText ?? ""`);
  const expected = await expectedCompletedPct();
  if (expected === null || !pct.includes(`${expected}%`)) throw new Error(`dashboard shows "${pct.replace(/\n/g, " ")}" but the database gives ${expected}%`);
  if (expected !== 75) console.log(`  note: ${expected}% completed; the seed gives 75% (6 of 8 finished) once seed.sql has been re-run`);
});

// ---------- A. interactions
await step("A1 Yusuf's patient page shows the warfarin + aspirin interaction alert", async () => {
  await goto(`/patients/${YUSUF}`); await waitSel('[data-testid="patient-interactions"]'); await shot("A1-yusuf");
  const t = await text(); if (!/1 interaction alert/.test(t)) throw new Error("count missing: " + t.slice(0, 300)); if (!t.includes("Aspirin with Warfarin")) throw new Error("detail missing");
});
await step("A2 Dispense ibuprofen to Yusuf: red major card; save without the tick is refused", async () => {
  await goto(`/dispense?patient=${YUSUF}`); await waitSel('[data-testid="drug-search"]');
  await setV('[data-testid="drug-search"]', "Ibuprofen"); await waitOption("Ibuprofen"); await click('[data-testid="drug-option"]'); await waitSel('[data-testid="drug-picked"]');
  await waitSel('[data-testid="interaction-cards"] li[data-severity="major"]'); await shot("A2-interaction");
  const t = await text(); if (!t.includes("Don't take these together")) throw new Error("major wording missing");
  await setV('[data-testid="dose"]', "1 tablet"); await wait(200);
  await ev('[...document.querySelectorAll("button[type=submit]")].find(b => b.innerText.includes("Dispense and confirm")).click()');
  await waitFor("Tick the review box"); await shot("A2-refused");
});
await step("A3 tick 'I've reviewed' → dispensed; interaction_reviewed in audit_log; alert raised", async () => {
  await click("#reviewed"); await wait(200);
  await ev('[...document.querySelectorAll("button[type=submit]")].find(b => b.innerText.includes("Dispense and confirm")).click()');
  await waitFor("Saved for Yusuf Ibrahim"); await shot("A3-dispensed");
  const audit = await rest(`audit_log?select=action,detail&id=gt.${auditBefore}&order=id`);
  if (!audit.some((a) => a.action === "interaction_reviewed")) throw new Error("no interaction_reviewed audit row: " + audit.map((a) => a.action).join(","));
  const alerts = await rest(`alerts?select=detail&patient_id=eq.${YUSUF}&type=eq.interaction&status=eq.open`);
  if (!alerts.some((a) => /Ibuprofen with Warfarin/.test(a.detail))) throw new Error("no ibuprofen alert: " + JSON.stringify(alerts));
});
await step("A4 Yusuf's Home: the new medicine shows; Scan tab needs a photo, so the API check is covered by dispense", async () => {
  await login("08000000308", "/home"); await waitFor("Ibuprofen"); await shot("A4-yusuf-home");
});
await step("A5 verify queue: a pending entry with a major interaction asks for the review tick (Folake + warfarin)", async () => {
  // Give Folake a pending warfarin entry, then check the queue shows the card and the tick for her aspirin? She has none, so use Yusuf: a pending entry for him.
  const [p] = await rest("prescriptions", { method: "POST", body: JSON.stringify({ patient_id: YUSUF, hospital_id: "a0000000-0000-4000-8000-000000000001", drug_id: "e0000000-0000-4000-8000-000000000031", drug_name: "Diclofenac", strength: "50 mg", form: "tablet", dose: "1 tablet", frequency_per_day: 2, with_food: "after", instructions_plain: "Take 1 tablet twice a day, after food.", source: "self", status: "pending", confirmed_by_patient: true, created_by: YUSUF, pill_shape: "round", pill_color: "#FFFFFF" }) });
  await rest("reminders", { method: "POST", body: JSON.stringify([{ prescription_id: p.id, patient_id: YUSUF, time_of_day: "08:00", channel: "app" }, { prescription_id: p.id, patient_id: YUSUF, time_of_day: "20:00", channel: "app" }]) });
  try {
    await login("08000000104", "/dashboard"); await goto("/verify"); await waitFor("Diclofenac"); await waitSel('[data-testid="verify-interactions"] li[data-severity="major"]'); await shot("A5-queue");
    const r = await ev(`(()=>{const a=[...document.querySelectorAll('[data-testid="verify-entry"]')].find(a=>a.innerText.includes("Diclofenac")); a.querySelector('[data-testid="verify-approve"] button').click(); return "ok";})()`); if (r !== "ok") throw new Error(r);
    await waitFor("Tick the review box");
    await ev(`(()=>{const a=[...document.querySelectorAll('[data-testid="verify-entry"]')].find(a=>a.innerText.includes("Diclofenac")); a.querySelector('input[name="reviewed"]').click(); a.querySelector('[data-testid="verify-approve"] button').click(); return "ok";})()`);
    await waitFor("Approved Diclofenac for Yusuf Ibrahim"); await shot("A5-approved");
    const row = (await rest(`prescriptions?select=status,interaction_reviewed_by&id=eq.${p.id}`))[0]; if (row.status !== "verified" || !row.interaction_reviewed_by) throw new Error("row: " + JSON.stringify(row));
  } finally {
    await rest(`alerts?prescription_id=eq.${p.id}`, { method: "DELETE" }); await rest(`reminders?prescription_id=eq.${p.id}`, { method: "DELETE" }); await rest(`prescriptions?id=eq.${p.id}`, { method: "DELETE" });
  }
});

console.log("\n=== RESULTS ===\n" + results.join("\n"));
ws.close(); chrome.kill(); process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
