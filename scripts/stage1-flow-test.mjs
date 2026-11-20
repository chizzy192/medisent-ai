// Stage 1 flow test. Needs a running server with Supabase keys and NEXT_PUBLIC_DEMO_MODE=true,
// plus a roster row AH-PH-003 "Amara Test-Pharmacist" (PCN DEMO-PCN-2004, +2348000000107) in Adaeze.
// Run: node scripts/stage1-flow-test.mjs http://localhost:3000
// Drives the Stage 1 "Done when" flows in headless Chrome over CDP against http://localhost:3010.
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3010";
const OUT = "test-output/stage1";
mkdirSync(OUT, { recursive: true });
const port = 9500 + Math.floor(Math.random() * 400);
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--disable-gpu", "--no-first-run", `--remote-debugging-port=${port}`, `--user-data-dir=${process.env.TEMP}/cdp-s1-${port}`, "--window-size=390,844", "about:blank"]);
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
await send("Page.enable"); await send("Network.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });

const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.value;
const goto = async (path) => { await send("Page.navigate", { url: BASE + path }); await wait(1500); };
const text = () => evaluate("document.body.innerText");
const url = () => evaluate("location.pathname");
async function waitFor(substr, timeout = 25000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) { const t = await text(); if (t.includes(substr)) return true; await wait(400); }
  throw new Error(`timeout waiting for "${substr}" at ${await url()}\n--- page text ---\n${(await text()).slice(0, 800)}`);
}
async function waitForPath(path, timeout = 25000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) { if ((await url()) === path) return true; await wait(400); }
  throw new Error(`timeout waiting for path ${path}, at ${await url()}\n${(await text()).slice(0, 600)}`);
}
async function shot(name) {
  const h = await evaluate("document.documentElement.scrollHeight");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: Math.min(h, 4000), deviceScaleFactor: 1, mobile: true });
  const s = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(s.data, "base64"));
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  console.log("  shot", name);
}
// React-compatible value setting (native setter + input/change events).
const setValue = (sel, value) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return "missing " + ${JSON.stringify(sel)};
  const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); return "ok"; })()`);
const check = (sel) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el.checked) el.click(); return el.checked; })()`);
const click = (sel) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return "missing " + ${JSON.stringify(sel)}; el.click(); return "ok"; })()`);
const clickText = (txt) => evaluate(`(() => { const el = [...document.querySelectorAll("button,a")].find(b => b.innerText.trim() === ${JSON.stringify(txt)}); if (!el) return "missing"; el.click(); return "ok"; })()`);
const clearSession = async () => { await send("Network.clearBrowserCookies"); };
const results = [];
const only = process.env.ONLY; // ONLY=E1 runs just the steps whose name starts with E1
const step = async (name, fn) => { if (only && !name.startsWith(only)) return; try { await fn(); results.push(`PASS ${name}`); console.log("PASS", name); } catch (e) { results.push(`FAIL ${name}: ${e.message}`); console.log("FAIL", name, e.message); } };

const HOSP = "a0000000-0000-4000-8000-000000000001";
async function fillStaff(fullName, staffId, licenceNo) {
  await goto("/signup"); await waitFor("Create your account");
  await setValue("#hospital", HOSP); await wait(200);
  await setValue("#role", "pharmacist"); await wait(300);
  await setValue("#fullName", fullName); await setValue("#staffId", staffId);
  await setValue("#licenceBody", "PCN"); await setValue("#licenceNo", licenceNo);
  await check("#consent");
  await click('button[name="intent"][value="start"]');
}

await step("A1 pharmacist signup matches roster and shows the demo code", async () => {
  await clearSession();
  await fillStaff("Amara Test-Pharmacist", "AH-PH-003", "DEMO-PCN-2004");
  await waitFor("Demo only"); await shot("A1-otp");
});
await step("A2 wrong code is refused with tries left", async () => {
  await setValue("#code", "000000"); await click('button[name="intent"][value="confirm"]');
  await waitFor("does not match"); await shot("A2-wrong-code");
});
await step("A3 correct code signs in and lands on the staff dashboard", async () => {
  await setValue("#code", "123456"); await click('button[name="intent"][value="confirm"]');
  await waitForPath("/dashboard"); await waitFor("Welcome to Adaeze"); await shot("A3-dashboard");
  const t = await text(); if (!t.includes("Dashboard") || !t.includes("Alerts")) throw new Error("staff bottom bar missing");
});
await step("A4 sign out from Me", async () => {
  await goto("/me"); await waitFor("Sign out"); await shot("A4-me"); await clickText("Sign out"); await waitForPath("/");
});

await step("B1 fake staff ID is rejected (1st try)", async () => {
  await clearSession(); await fillStaff("Fake Person", "AH-PH-999", "DEMO-PCN-9999");
  await waitFor("could not find you"); await shot("B1-rejected");
});
await step("B2 third miss blocks the ID", async () => {
  for (let i = 0; i < 2; i++) { await fillStaff("Fake Person", "AH-PH-999", "DEMO-PCN-9999"); await wait(1500); }
  await waitFor("blocked"); await shot("B2-blocked");
});

await step("C1 seeded pharmacist signup says the account exists", async () => {
  await clearSession(); await fillStaff("Chidinma Okafor", "AH-PH-001", "DEMO-PCN-2001");
  await waitFor("already have an account"); await shot("C1-exists");
});

await step("D1 patient login with phone, code, lands on home with hospital name", async () => {
  await clearSession(); await goto("/login"); await waitFor("Sign in");
  await setValue("#identifier", "08000000302"); await click('button[name="intent"][value="start"]');
  await waitFor("Demo only"); await setValue("#code", "123456"); await click('button[name="intent"][value="confirm"]');
  await waitForPath("/home"); await waitFor("Adaeze Specialist Hospital (Demo)"); await waitFor("Lisinopril"); await shot("D1-home"); const tt = await text(); if (!tt.includes("Welcome")) throw new Error("expected the English greeting on home");
  const t = await text(); if (!t.includes("Scan") || !t.includes("Forum")) throw new Error("patient bottom bar missing");
});
await step("D2 patient cannot open the staff dashboard", async () => {
  await goto("/dashboard"); await wait(1500); if ((await url()) !== "/home") throw new Error("expected redirect to /home, got " + (await url()));
});

await step("E1 hospital admin sees the blocked ID on verifications and unblocks it", async () => {
  await clearSession(); await goto("/login"); await waitFor("Sign in");
  await setValue("#identifier", "08000000101"); await click('button[name="intent"][value="start"]');
  await waitFor("Demo only"); await setValue("#code", "123456"); await click('button[name="intent"][value="confirm"]');
  await waitForPath("/hospital"); await waitFor("Adaeze Specialist Hospital (Demo)"); await shot("E1-hospital");
  await goto("/verifications"); await waitFor("AH-PH-999"); await shot("E2-verifications");
  await clickText("Unblock"); const t0 = Date.now(); while (Date.now() - t0 < 15000) { if (!(await text()).includes("AH-PH-999")) break; await wait(500); } if ((await text()).includes("AH-PH-999")) throw new Error("still blocked after unblock"); await shot("E3-unblocked");
});
await step("F1 platform admin login lands on approve hospitals", async () => {
  await clearSession(); await goto("/login"); await waitFor("Sign in");
  await setValue("#identifier", "08000000001"); await click('button[name="intent"][value="start"]');
  await waitFor("Demo only"); await setValue("#code", "123456"); await click('button[name="intent"][value="confirm"]');
  await waitForPath("/approve-hospitals"); await waitFor("Approve hospitals"); await shot("F1-approve");
});

console.log("\n=== RESULTS ===\n" + results.join("\n"));
ws.close(); chrome.kill(); process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
