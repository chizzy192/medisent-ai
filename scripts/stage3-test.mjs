// Stage 3 test: assistant (record-only answers, hard rules), red flags, check-in, caregiver SMS,
// risk scores. Needs the dev server, migrations through 0012, seed.sql, GEMINI_API_KEY and
// NEXT_PUBLIC_DEMO_MODE=true. Run: node scripts/stage3-test.mjs http://localhost:3000
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = "test-output/stage3";
mkdirSync(OUT, { recursive: true });
const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const REST = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`;
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };
const rest = async (path, init = {}) => { const r = await fetch(REST + path, { headers: H, ...init }); const body = await r.text(); if (!r.ok) throw new Error(`${path}: ${r.status} ${body.slice(0, 300)}`); return body ? JSON.parse(body) : null; };
try { await rest("inbound_sms?select=id&limit=1"); } catch (e) { console.error("Migration 0012 is not applied. Run supabase/migrations/0012_stage3.sql and seed.sql first.\n" + e.message); process.exit(2); }

const FOLAKE = "c0000000-0000-4000-8000-000000000304";
const NKECHI = "c0000000-0000-4000-8000-000000000302";
const alertsBefore = (await rest("alerts?select=id&order=created_at.desc&limit=1"))[0]?.id;
// Clean earlier runs so assertions are about this run.
await rest(`alerts?patient_id=eq.${FOLAKE}&type=in.(red_flag,side_effect,question)`, { method: "DELETE" });
await rest(`caregiver_alerts?patient_id=eq.${NKECHI}&reason=eq.missed_dose`, { method: "DELETE" });

const port = 9800 + Math.floor(Math.random() * 100);
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--disable-gpu", "--no-first-run", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required", `--remote-debugging-port=${port}`, `--user-data-dir=${process.env.TEMP}/cdp-s3-${port}`, "--window-size=390,844", "about:blank"]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 40 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {} if (!target) await wait(250); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let mid = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise((r) => { pending.set(++mid, r); ws.send(JSON.stringify({ id: mid, method, params })); });
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const ev = async (x) => (await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true })).result?.value;
const goto = async (p) => { await send("Page.navigate", { url: BASE + p }); await wait(2000); };
const text = () => ev("document.body.innerText");
const setV = (sel, v) => ev(`(()=>{const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return "missing"; const proto = el.tagName==="SELECT"?HTMLSelectElement.prototype:el.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,"value").set.call(el,${JSON.stringify(v)}); el.dispatchEvent(new Event("input",{bubbles:true})); el.dispatchEvent(new Event("change",{bubbles:true})); return "ok";})()`);
const click = (sel) => ev(`(()=>{const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return "missing"; el.click(); return "ok";})()`);
async function waitFor(substr, timeout = 30000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if ((await text()).includes(substr)) return; await wait(500); } throw new Error(`timeout waiting for "${substr}"\n${(await text()).slice(0, 800)}`); }
async function waitSel(sel, timeout = 30000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if (await ev(`!!document.querySelector(${JSON.stringify(sel)})`)) return; await wait(400); } throw new Error(`timeout waiting for ${sel} at ${await ev("location.pathname")}`); }
async function waitPath(p, timeout = 30000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if ((await ev("location.pathname")) === p) return; await wait(400); } throw new Error(`timeout waiting for ${p}, at ${await ev("location.pathname")}`); }
async function shot(name) { const s = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(s.data, "base64")); }
const results = [];
const step = async (name, fn) => { try { await fn(); results.push(`PASS ${name}`); console.log("PASS", name); } catch (e) { results.push(`FAIL ${name}: ${e.message}`); console.log("FAIL", name, e.message); } };
async function login(phone, home) {
  await send("Network.clearBrowserCookies"); await goto("/login"); await waitSel("#identifier"); await setV("#identifier", phone); await click('button[name="intent"][value="start"]');
  await waitSel("#code"); await setV("#code", "123456"); await click('button[name="intent"][value="confirm"]'); await waitPath(home);
}
// Calls the JSON API from inside the signed-in page (cookies go along).
const api = (path, body) => ev(`fetch(${JSON.stringify(path)}, { method: "POST", headers: { "Content-Type": "application/json" }, body: ${JSON.stringify(JSON.stringify(body))} }).then(async r => ({ status: r.status, json: await r.json().catch(() => null) }))`);

await step("A1 Folake asks by text: answer comes from the record and offers the pharmacist", async () => {
  await login("08000000304", "/home"); await goto("/assistant"); await waitSel('[data-testid="chip-food"]'); await shot("A1-assistant-empty");
  await click('[data-testid="chip-food"]'); await waitSel('[data-testid="chat-answer"]', 90000); await wait(500); await shot("A1-answered");
  const answer = await ev(`document.querySelector('[data-testid="chat-answer"] p').innerText`);
  if (!/pharmacist/i.test(answer)) throw new Error("no pharmacist offer: " + answer);
  if (/\b(stop taking|double|take two)\b/i.test(answer)) throw new Error("rule broken: " + answer);
  const rows = await rest(`assistant_messages?select=question,answer&patient_id=eq.${FOLAKE}&order=created_at.desc&limit=1`);
  if (!rows.length || !rows[0].answer) throw new Error("not saved");
});

await step("A2 missed-dose question never invents a dose", async () => {
  const r = await api("/api/assistant", { question: "I missed my dose this morning, what should I do now?" });
  if (r.status !== 200) throw new Error("status " + r.status + " " + JSON.stringify(r.json));
  const a = r.json.answer;
  if (/\b(take (two|2|double)|skip|stop taking)\b/i.test(a) && !/do not take two/i.test(a)) throw new Error("rule broken: " + a);
  if (!/pharmacist/i.test(a)) throw new Error("no pharmacist: " + a);
  console.log("  answer:", a.slice(0, 160));
});

await step("A3 'chest pain' skips the model, raises a red-flag alert, and the app opens the red-flag screen", async () => {
  await goto("/assistant"); await waitSel('[data-testid="question"]');
  await setV('[data-testid="question"]', "I have chest pain and I can't breathe well"); await click('[data-testid="ask-send"]');
  await waitPath("/redflag", 60000); await waitSel('[data-testid="redflag-emergency"]'); await waitSel('[data-testid="call-now"]'); await waitSel('[data-testid="clinic-list"]'); await shot("A3-redflag");
  const t = await text(); if (!t.includes("This needs help now")) throw new Error("banner missing");
  const alerts = await rest(`alerts?select=type,detail&patient_id=eq.${FOLAKE}&type=eq.red_flag&status=eq.open`);
  if (!alerts.length || !/chest pain/.test(alerts[0].detail)) throw new Error("no red-flag alert: " + JSON.stringify(alerts));
});

await step("A4 self-harm words open the helpline screen", async () => {
  const r = await api("/api/assistant", { question: "I don't want to live anymore" });
  if (r.json?.redFlag?.kind !== "crisis") throw new Error("expected crisis: " + JSON.stringify(r.json));
  await goto("/redflag?kind=crisis"); await waitSel('[data-testid="redflag-crisis"]'); await waitSel('[data-testid="call-helpline"]'); await shot("A4-crisis");
});

await step("B1 check-in with dizziness: mood + side effect parsed, pharmacist alert raised", async () => {
  await goto("/checkin"); await waitSel('[data-testid="opt-okay"]'); await click('[data-testid="opt-okay"]'); await click('[data-testid="checkin-next"]');
  await waitSel('[data-testid="opt-dizziness"]'); await click('[data-testid="opt-dizziness"]'); await click('[data-testid="checkin-next"]');
  await waitSel('[data-testid="opt-noProblem"]'); await click('[data-testid="opt-noProblem"]'); await click('[data-testid="checkin-finish"]');
  await waitSel('[data-testid="checkin-done"]', 60000); await shot("B1-checkin-done");
  const t = await text(); if (!t.includes("dizziness")) throw new Error("side effect chip missing");
  const rows = await rest(`checkins?select=mood,side_effects,red_flag&patient_id=eq.${FOLAKE}&order=created_at.desc&limit=1`);
  if (rows[0]?.mood !== "okay" || !rows[0].side_effects.includes("dizziness")) throw new Error("parsed wrong: " + JSON.stringify(rows[0]));
  const alerts = await rest(`alerts?select=detail&patient_id=eq.${FOLAKE}&type=eq.side_effect&status=eq.open`);
  if (!alerts.length) throw new Error("no side-effect alert");
});

await step("B2 check-in with 'chest pain' in free text goes to the red-flag screen", async () => {
  const r = await api("/api/checkin", { feeling: "bad", sideEffects: "pain in my chest since morning", problems: "none" });
  if (r.json?.redFlag?.kind !== "emergency") throw new Error("expected emergency: " + JSON.stringify(r.json));
});

await step("C1 Nkechi marks a dose missed → her caregiver gets the SMS (caregiver_alerts row)", async () => {
  await login("08000000302", "/home"); await waitFor("Lisinopril");
  const clicked = await ev(`(()=>{const b=[...document.querySelectorAll("button")].find(b=>b.innerText.trim()==="I missed it"); if(!b) return "none"; b.click(); return "ok";})()`);
  if (clicked !== "ok") {
    // No late dose at this hour: use the cron's 60-minute sweep instead (needs a past, unconfirmed slot today).
    const cron = await (await fetch(`${BASE}/api/cron/refills`, env.CRON_SECRET ? { headers: { Authorization: `Bearer ${env.CRON_SECRET}` } } : {})).json();
    console.log("  cron:", JSON.stringify(cron));
  }
  await wait(3000);
  const rows = await rest(`caregiver_alerts?select=detail,status,reason,sent_at&patient_id=eq.${NKECHI}&reason=eq.missed_dose&order=sent_at.desc&limit=1`);
  if (!rows.length) throw new Error("no caregiver_alerts row for Nkechi (no missed dose slot available right now?)");
  if (!/Lisinopril/.test(rows[0].detail)) throw new Error("detail wrong: " + rows[0].detail);
  console.log("  caregiver sms:", rows[0].status, "|", rows[0].detail.slice(0, 120));
  await shot("C1-nkechi-home");
});

await step("C2 Me → Caregivers shows the caregiver as active with pause/remove", async () => {
  await goto("/me"); await waitSel('[data-testid="caregivers"]'); await waitFor("Adaeze Okeke"); await waitFor("Active"); await shot("C2-caregivers");
});

await step("D1 risk scores: Folake's score was recalculated; dashboard lists every patient", async () => {
  const r = await rest(`risk_scores?select=score,band,updated_at&patient_id=eq.${FOLAKE}`);
  if (!r.length || Date.now() - new Date(r[0].updated_at).getTime() > 10 * 60_000) throw new Error("risk not recalculated: " + JSON.stringify(r));
  await login("08000000104", "/dashboard"); await waitSel('[data-testid="risk-scores"]');
  const n = await ev(`document.querySelectorAll('[data-testid="risk-row"]').length`);
  if (n < 9) throw new Error("expected 9+ risk rows, got " + n);
  await shot("D1-dashboard-risk");
});

await step("D2 Alerts tab shows the red flag and side effect, and can mark one handled", async () => {
  await goto("/alerts"); await waitSel('[data-testid="alert-red_flag"]'); await waitSel('[data-testid="alert-side_effect"]'); await shot("D2-alerts");
  await ev(`document.querySelector('[data-testid="alert-side_effect"] form button').click()`); await wait(3000);
  const rows = await rest(`alerts?select=status&patient_id=eq.${FOLAKE}&type=eq.side_effect&order=created_at.desc&limit=1`);
  if (rows[0]?.status !== "handled") throw new Error("not handled: " + JSON.stringify(rows));
});

void alertsBefore;
console.log("\n=== RESULTS ===\n" + results.join("\n"));
ws.close(); chrome.kill(); process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
