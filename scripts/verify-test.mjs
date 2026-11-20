// Verification-queue test: resets the three seeded patient entries to pending (service role from
// .env.local), signs in as pharmacist 08000000104 in headless Chrome, runs Approve on one entry,
// Edit → "Save and approve" on another, Reject on the third, then checks the rows' status,
// reminders, refills and audit_log through the REST API. Needs the dev server, migration 0010
// and seed.sql. Run: node scripts/verify-test.mjs http://localhost:3000
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = "test-output/verify";
mkdirSync(OUT, { recursive: true });
const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const REST = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`;
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };
const rest = async (path, init = {}) => { const r = await fetch(REST + path, { headers: H, ...init }); const body = await r.text(); if (!r.ok) throw new Error(`${path}: ${r.status} ${body.slice(0, 300)}`); return body ? JSON.parse(body) : null; };

const ENTRIES = {
  approve: { id: "f0000000-0000-4000-8000-000000000101", patient: "Folake Adebayo", drug: "Amoxicillin" },
  edit: { id: "f0000000-0000-4000-8000-000000000102", patient: "Chukwudi Agu", drug: "Paracetamol" },
  reject: { id: "f0000000-0000-4000-8000-000000000103", patient: "Emeka Nwosu", drug: "Atorvastatin" },
};
const ids = Object.values(ENTRIES).map((e) => e.id);
const inList = `in.(${ids.join(",")})`;

// ---- reset to the seeded state so the test can run again and again
await rest(`prescriptions?id=${inList}`, { method: "PATCH", body: JSON.stringify({ status: "pending", verified_by: null, verified_at: null, rejection_reason: null, active: true, patient_notified_at: null }) });
await rest(`reminders?prescription_id=${inList}`, { method: "PATCH", body: JSON.stringify({ active: true }) });
await rest(`refills?prescription_id=${inList}`, { method: "PATCH", body: JSON.stringify({ refilled: false }) });
const auditBefore = (await rest(`audit_log?select=id&target_table=eq.prescriptions&target_id=${inList}&order=id.desc&limit=1`))[0]?.id ?? 0;
console.log("reset 3 entries to pending; last audit id", auditBefore);

// ---- headless Chrome over CDP
const port = 9700 + Math.floor(Math.random() * 200);
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--disable-gpu", "--no-first-run", `--remote-debugging-port=${port}`, `--user-data-dir=${process.env.TEMP}/cdp-vf-${port}`, "--window-size=1200,900", "about:blank"]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 40 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {} if (!target) await wait(250); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let mid = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise((r) => { pending.set(++mid, r); ws.send(JSON.stringify({ id: mid, method, params })); });
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false });
const ev = async (x) => (await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true })).result?.value;
const goto = async (p) => { await send("Page.navigate", { url: BASE + p }); await wait(2000); };
const text = () => ev("document.body.innerText");
const setV = (sel, v, root = "document") => ev(`(()=>{const el=${root}.querySelector(${JSON.stringify(sel)}); if(!el) return "missing"; const proto = el.tagName==="SELECT"?HTMLSelectElement.prototype:el.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,"value").set.call(el,${JSON.stringify(v)}); el.dispatchEvent(new Event("input",{bubbles:true})); el.dispatchEvent(new Event("change",{bubbles:true})); return "ok";})()`);
const click = (sel) => ev(`(()=>{const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return "missing"; el.click(); return "ok";})()`);
async function waitFor(substr, timeout = 30000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if ((await text()).includes(substr)) return; await wait(500); } throw new Error(`timeout waiting for "${substr}"\n${(await text()).slice(0, 800)}`); }
async function shot(name) { const s = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(s.data, "base64")); }
const results = [];
const step = async (name, fn) => { try { await fn(); results.push(`PASS ${name}`); console.log("PASS", name); } catch (e) { results.push(`FAIL ${name}: ${e.message}`); console.log("FAIL", name, e.message); } };
// The card for one entry, found by patient + drug name.
const card = (e) => `[...document.querySelectorAll('[data-testid="verify-entry"]')].find(a => a.innerText.includes(${JSON.stringify(e.patient)}) && a.innerText.includes(${JSON.stringify(e.drug)}))`;
const clickIn = (e, which) => ev(`(()=>{const a=${card(e)}; if(!a) return "no card"; const b=[...a.querySelectorAll("button")].find(b=>b.innerText.trim()===${JSON.stringify(which)}); if(!b) return "no button "+${JSON.stringify(which)}; b.click(); return "ok";})()`);
async function waitDone(e, substr) {
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    const t = await text();
    if (t.includes(substr)) return;
    const err = await ev(`(()=>{const a=${card(e)}; if(!a) return ""; const m=a.querySelector('[role="alert"]'); return m?m.innerText:"";})()`);
    if (err && /could not save|not from your hospital|already checked/i.test(err)) throw new Error("card shows error: " + err);
    await wait(500);
  }
  throw new Error(`timeout waiting for "${substr}"\n${(await text()).slice(0, 800)}`);
}

await step("login as pharmacist 08000000104", async () => {
  await send("Network.clearBrowserCookies"); await goto("/login"); await setV("#identifier", "08000000104"); await click('button[name="intent"][value="start"]'); await wait(2500);
  await setV("#code", "123456"); await click('button[name="intent"][value="confirm"]'); await wait(4000);
  const path = await ev("location.pathname"); if (path !== "/dashboard") throw new Error("landed on " + path);
});

await step("queue lists the three seeded entries", async () => {
  await goto("/verify"); for (const e of Object.values(ENTRIES)) await waitFor(e.patient); await shot("1-queue");
});

await step("Approve → done message, entry leaves the queue", async () => {
  const r = await ev(`(()=>{const a=${card(ENTRIES.approve)}; if(!a) return "no card"; a.querySelector('[data-testid="verify-approve"] button').click(); return "ok";})()`);
  if (r !== "ok") throw new Error(r);
  await waitDone(ENTRIES.approve, `Approved ${ENTRIES.approve.drug} for ${ENTRIES.approve.patient}`); await shot("2-approved");
  await goto("/verify"); const t = await text(); if (t.includes(ENTRIES.approve.drug) && t.includes(ENTRIES.approve.patient)) throw new Error("approved entry still in the queue");
});

await step("Edit → Save and approve → done message, entry leaves the queue", async () => {
  const r = await clickIn(ENTRIES.edit, "Edit and approve"); if (r !== "ok") throw new Error(r);
  await wait(500);
  const set = await setV('input[name="dose"]', "1 tablet", card(ENTRIES.edit)); if (set !== "ok") throw new Error("dose field: " + set);
  const freq = await ev(`(()=>{const a=${card(ENTRIES.edit)}; const s=a.querySelector('select[id$="-frequency"]'); if(!s) return "no select"; Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value").set.call(s,"2"); s.dispatchEvent(new Event("change",{bubbles:true})); return "ok";})()`); if (freq !== "ok") throw new Error(freq);
  await wait(300); await shot("3-edit-form");
  const sub = await clickIn(ENTRIES.edit, "Save and approve"); if (sub !== "ok") throw new Error(sub);
  await waitDone(ENTRIES.edit, `Corrected and approved ${ENTRIES.edit.drug} for ${ENTRIES.edit.patient}`); await shot("4-edited");
  await goto("/verify"); const t = await text(); if (t.includes(ENTRIES.edit.drug) && t.includes(ENTRIES.edit.patient)) throw new Error("edited entry still in the queue");
});

await step("Reject with a reason → done message, entry leaves the queue", async () => {
  const r = await clickIn(ENTRIES.reject, "Reject"); if (r !== "ok") throw new Error(r);
  await wait(500);
  const set = await setV('textarea[name="reason"]', "Not on your prescription. Please bring the pack to the pharmacy.", card(ENTRIES.reject)); if (set !== "ok") throw new Error("reason field: " + set);
  const sub = await clickIn(ENTRIES.reject, "Reject and tell the patient"); if (sub !== "ok") throw new Error(sub);
  await waitDone(ENTRIES.reject, `Rejected ${ENTRIES.reject.drug} for ${ENTRIES.reject.patient}`); await shot("5-rejected");
  await goto("/verify"); await waitFor("Nothing to check");
});

await step("database: statuses, reminders, refills and audit_log match", async () => {
  const rows = await rest(`prescriptions?select=id,status,dose,frequency_per_day,active,verified_by,verified_at,rejection_reason,patient_notified_at&id=${inList}`);
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  const a = byId[ENTRIES.approve.id], e = byId[ENTRIES.edit.id], j = byId[ENTRIES.reject.id];
  if (a.status !== "verified" || !a.verified_by || !a.verified_at || !a.patient_notified_at) throw new Error("approve row wrong: " + JSON.stringify(a));
  if (e.status !== "edited" || e.dose !== "1 tablet" || e.frequency_per_day !== 2 || !e.verified_by) throw new Error("edit row wrong: " + JSON.stringify(e));
  if (j.status !== "rejected" || j.active !== false || !j.rejection_reason) throw new Error("reject row wrong: " + JSON.stringify(j));
  const rems = await rest(`reminders?select=prescription_id,time_of_day,active&prescription_id=${inList}&order=time_of_day`);
  const editActive = rems.filter((r) => r.prescription_id === ENTRIES.edit.id && r.active).map((r) => r.time_of_day.slice(0, 5));
  const editInactive = rems.filter((r) => r.prescription_id === ENTRIES.edit.id && !r.active).length;
  if (editActive.join(",") !== "08:00,20:00" || editInactive < 3) throw new Error(`edit reminders wrong: active=${editActive} inactive=${editInactive}`);
  if (rems.some((r) => r.prescription_id === ENTRIES.reject.id && r.active)) throw new Error("rejected entry still has active reminders");
  const refills = await rest(`refills?select=prescription_id,refilled,doses_per_day&prescription_id=${inList}`);
  const editRefills = refills.filter((r) => r.prescription_id === ENTRIES.edit.id);
  if (!editRefills.some((r) => !r.refilled && r.doses_per_day === 2) || !editRefills.some((r) => r.refilled)) throw new Error("edit refills wrong: " + JSON.stringify(editRefills));
  const audit = await rest(`audit_log?select=action,target_id,actor_id,detail&target_table=eq.prescriptions&target_id=${inList}&id=gt.${auditBefore}&order=id`);
  const actions = audit.map((x) => `${x.action}:${x.target_id.slice(-3)}`);
  for (const want of ["prescription_verified:101", "prescription_edited:102", "prescription_rejected:103"]) if (!actions.includes(want)) throw new Error("audit missing " + want + " in " + actions.join(" "));
  if (audit.some((x) => !x.actor_id)) throw new Error("audit row without actor");
  console.log("  audit:", actions.join(" "));
});

console.log("\n=== RESULTS ===\n" + results.join("\n"));
ws.close(); chrome.kill(); process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
