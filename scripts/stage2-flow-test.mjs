// Stage 2 flow test (medication intake): Folake adds a medicine from a pack photo (reader
// pre-fill, formulary pick, dose typed as told) → pending; the Scan tab matches the pack to her
// record; the pharmacist approves it from the queue and dispenses another from the formulary.
// It drives the UI by ids and data-testid, not by visible text, except for a few plain sentences.
// Needs: a running server with Supabase keys, GEMINI_API_KEY and NEXT_PUBLIC_DEMO_MODE=true,
// migrations through 0010 applied, seed.sql run, and a demo pack image (Amoxicillin 500 mg). Run:
//   node scripts/stage2-flow-test.mjs http://localhost:3000 <absolute path to label.png>
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const LABEL = process.argv[3] ?? "test-output/label.png";
const OUT = "test-output/stage2";
mkdirSync(OUT, { recursive: true });
const port = 9500 + Math.floor(Math.random() * 400);
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--disable-gpu", "--no-first-run", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required", `--remote-debugging-port=${port}`, `--user-data-dir=${process.env.TEMP}/cdp-s2-${port}`, "--window-size=390,844", "about:blank"]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 40 && !target; i++) {
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {}
  if (!target) await wait(250);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
await send("Page.enable"); await send("Network.enable"); await send("DOM.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
const goto = async (path) => { await send("Page.navigate", { url: BASE + path }); await wait(1500); };
const text = () => evaluate("document.body.innerText");
const url = () => evaluate("location.pathname");
async function waitFor(substr, timeout = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) { if ((await text()).includes(substr)) return; await wait(500); }
  throw new Error(`timeout waiting for "${substr}" at ${await url()}\n${(await text()).slice(0, 600)}`);
}
async function waitForSel(sel, timeout = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) { if (await evaluate(`!!document.querySelector(${JSON.stringify(sel)})`)) return; await wait(500); }
  throw new Error(`timeout waiting for ${sel} at ${await url()}\n${(await text()).slice(0, 600)}`);
}
async function waitForPath(path, timeout = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) { if ((await url()).startsWith(path)) return; await wait(400); }
  throw new Error(`timeout waiting for ${path}, at ${await url()}`);
}
async function shot(name) {
  const h = await evaluate("document.documentElement.scrollHeight");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: Math.min(h, 5000), deviceScaleFactor: 1, mobile: true });
  const s = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(s.data, "base64"));
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  console.log("  shot", name);
}
const setValue = (sel, value) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return "missing";
  const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); return "ok"; })()`);
const click = (sel) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return "missing"; el.click(); return "ok"; })()`);
const results = [];
const step = async (name, fn) => { try { await fn(); results.push(`PASS ${name}`); console.log("PASS", name); } catch (e) { results.push(`FAIL ${name}: ${e.message}`); console.log("FAIL", name, e.message); } };

async function login(phone) {
  await send("Network.clearBrowserCookies");
  await goto("/login"); await waitForSel("#identifier");
  await setValue("#identifier", phone); await click('button[name="intent"][value="start"]');
  await waitForSel("#code"); await setValue("#code", "123456"); await click('button[name="intent"][value="confirm"]');
}
async function setFile(sel) {
  const { root } = await send("DOM.getDocument");
  const { nodeId } = await send("DOM.querySelector", { nodeId: root.nodeId, selector: sel });
  await send("DOM.setFileInputFiles", { nodeId, files: [LABEL.replace(/\//g, "\\")] });
  await evaluate(`document.querySelector(${JSON.stringify(sel)}).dispatchEvent(new Event("change", { bubbles: true }))`);
}
const clickText = (txt) => evaluate(`(() => { const el = [...document.querySelectorAll("button,a")].find(b => b.innerText.trim() === ${JSON.stringify(txt)}); if (!el) return "missing"; el.click(); return "ok"; })()`);

await step("A1 patient (Folake) logs in", async () => { await login("08000000304"); await waitForPath("/home"); await shot("A1-home-before"); });

await step("A2 Add a medicine: pack photo read; printed fields with confidence, never a dose", async () => {
  await goto("/add"); await waitForSel('[data-testid="pack-photo-file"]');
  await setFile('[data-testid="pack-photo-file"]'); await wait(800);
  await click('[data-testid="add-read"]');
  await waitForSel('[data-testid="drug-search"], [data-testid="drug-picked"]', 120000); await wait(1200); await shot("A2-read");
  const t = await text();
  if (!/Amoxicillin/i.test(t)) throw new Error("name not read: " + t.slice(0, 300));
  if (!t.includes("%")) throw new Error("no confidence shown");
  if (/\b(1 capsule|three times|tds)\b/i.test(t)) throw new Error("a dose leaked into the reader output");
});

await step("A3 pick from the formulary (suggestion from the photo) and type the dose as told", async () => {
  const picked = await evaluate(`!!document.querySelector('[data-testid="drug-picked"]')`);
  if (!picked) { await click('[data-testid="drug-option"]'); await waitForSel('[data-testid="drug-picked"]'); }
  await click('[data-testid="add-continue"]'); await waitForSel('[data-testid="dose"]'); await shot("A3-dosing");
  await setValue('[data-testid="dose"]', "1 capsule"); await setValue("#dosing-frequency", "3"); await setValue('[data-testid="quantity"]', "15"); await wait(400);
  const times = await evaluate('document.querySelectorAll("input[type=time]").length'); if (times !== 3) throw new Error("expected 3 reminder times, got " + times);
  await waitFor("The app will say");
});

await step("A4 save lands on home: Not checked yet badge, reminders on the timeline", async () => {
  await click('[data-testid="add-save"]'); await waitForPath("/home", 90000); await waitForSel('[data-testid="added-notice"]'); await waitFor("Amoxicillin"); await wait(800); await shot("A4-home-after");
  const t = await text(); if (!t.includes("Not checked yet")) throw new Error("pending badge missing"); if (!/14:00/.test(t)) throw new Error("14:00 reminder missing: " + t.slice(0, 500));
});

await step("A5 medicines page shows the entry as added by you, not checked yet", async () => {
  await goto("/meds"); await waitFor("Amoxicillin"); await waitFor("Not checked yet"); await waitFor("added by you"); await shot("A5-meds");
});

await step("A6 Scan tab 'Is this my drug?' matches the pack to the record and shows the dose FROM THE RECORD", async () => {
  await goto("/scan"); await waitForSel('input[type="file"]'); await setFile('input[type="file"]');
  await waitForSel('[data-testid="scan-result"]', 120000); await wait(1000); await shot("A6-scan-match");
  const t = await text(); if (!t.includes("Your record says")) throw new Error("no match card: " + t.slice(0, 400)); if (!t.includes("1 capsule")) throw new Error("dose from the record missing");
  if (/fake/i.test(t)) throw new Error("the word 'fake' appeared");
});

await step("B1 pharmacist: dashboard shows entries to check; queue shows Folake's entry with reader vs patient", async () => {
  await login("08000000104"); await waitForPath("/dashboard"); await waitForSel('[data-testid="stat-pending"]'); await shot("B1-dashboard");
  await goto("/verify"); await waitFor("Folake Adebayo"); await waitFor("What the reader saw"); await waitFor("What the patient entered"); await shot("B1-queue");
});

await step("B2 pharmacist approves the entry; it leaves the queue", async () => {
  const ok = await evaluate(`(() => { const art = [...document.querySelectorAll('[data-testid="verify-entry"]')].find(a => a.innerText.includes("Folake Adebayo") && a.innerText.includes("Amoxicillin")); if (!art) return "none"; art.querySelector('[data-testid="verify-approve"] button').click(); return "ok"; })()`);
  if (ok !== "ok") throw new Error("Folake's entry not found in the queue");
  await waitFor("Approved Amoxicillin for Folake Adebayo", 30000); await shot("B2-approved");
});

await step("B3 dispense from the formulary for Folake", async () => {
  await goto("/dispense?q=Folake"); await waitFor("Folake Adebayo"); await clickText("Dispense"); await waitForSel('[data-testid="drug-search"]');
  await setValue('[data-testid="drug-search"]', "Omeprazole"); { const t0 = Date.now(); while (Date.now() - t0 < 30000 && !((await evaluate('document.querySelector("[data-testid=drug-option]")?.innerText ?? ""')).includes("Omeprazole"))) await wait(300); } await click('[data-testid="drug-option"]'); await waitForSel('[data-testid="drug-picked"]');
  await setValue('[data-testid="dose"]', "1 capsule"); await setValue('[data-testid="quantity"]', "30"); await wait(300);
  await evaluate('[...document.querySelectorAll("button[type=submit]")].find(b => b.innerText.includes("Dispense and confirm")).click()');
  await waitFor("Saved for Folake Adebayo", 30000); await shot("B3-dispensed");
});

await step("C1 patient sees the approval notice and the dispensed medicine as checked", async () => {
  await login("08000000304"); await waitForPath("/home"); await waitForSel('[data-testid="review-notice"]'); await waitFor("approved"); await shot("C1-home-reviewed");
  await goto("/meds"); await waitFor("Omeprazole"); await waitFor("from your hospital"); await shot("C1-meds");
});

console.log("\n=== RESULTS ===\n" + results.join("\n"));
ws.close(); chrome.kill(); process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
