// Speech check (English only): logs in as a patient, asks /api/speak for one sentence,
// records the provider / voice headers, saves the clip to test-output/voices/en.mp3 for a
// human to listen to, then clicks a Listen button in the app
// and reads the dev source badge. Run: node scripts/speech-test.mjs http://localhost:3000
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const SENTENCE = "Take 1 tablet twice a day after food";
const OUT = "test-output/voices";
mkdirSync(OUT, { recursive: true });
const port = 9800 + Math.floor(Math.random() * 150);
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--disable-gpu", "--no-first-run", "--autoplay-policy=no-user-gesture-required", `--remote-debugging-port=${port}`, `--user-data-dir=${process.env.TEMP}/cdp-sp-${port}`, "--window-size=390,844", "about:blank"]);
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
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const ev = async (x) => (await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true })).result?.value;
const goto = async (p) => { await send("Page.navigate", { url: BASE + p }); await wait(2500); };
const setV = (sel, v) => ev(`(()=>{const el=document.querySelector(${JSON.stringify(sel)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(el,${JSON.stringify(v)});el.dispatchEvent(new Event("input",{bubbles:true}));return "ok";})()`);
const click = (sel) => ev(`(()=>{const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return "missing"; el.click();return "ok";})()`);

await goto("/login"); await setV("#identifier", "08000000307"); await click('button[name="intent"][value="start"]'); await wait(3000);
await setV("#code", "123456"); await click('button[name="intent"][value="confirm"]'); await wait(5000);
console.log("logged in at", await ev("location.pathname"));

const rows = [];
for (const lang of ["en"]) {
  const r = await ev(`(async () => {
    const t0 = Date.now();
    const res = await fetch("/api/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: ${JSON.stringify(SENTENCE)} }) });
    const buf = res.status === 200 ? await res.arrayBuffer() : new ArrayBuffer(0);
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    return { status: res.status, source: res.headers.get("x-voice"), voice: res.headers.get("x-voice-name"), bytes: buf.byteLength, ms: Date.now() - t0, b64 };
  })()`);
  if (r.bytes) writeFileSync(`${OUT}/${lang}.mp3`, Buffer.from(r.b64, "base64"));
  rows.push({ lang, status: r.status, source: r.source, voice: r.voice, bytes: r.bytes, ms: r.ms });
  // Second call: should come from the server cache.
  const r2 = await ev(`fetch("/api/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: ${JSON.stringify(SENTENCE)} }) }).then(r => r.headers.get("x-voice"))`);
  rows[rows.length - 1].secondCall = r2;
}
console.table(rows);

// In-app: click the first Listen button on /meds and read the dev badge.
await goto("/meds"); await wait(1500);
const clicked = await ev(`(()=>{const b=[...document.querySelectorAll("article button[aria-pressed]")][0]; if(!b) return "none"; b.click(); return b.innerText.trim();})()`);
let badge = "";
for (let i = 0; i < 30 && !badge; i++) { await wait(500); badge = await ev(`[...document.querySelectorAll('[data-testid="voice-source"]')].map(e=>e.innerText).join(",")`); }
const playingCount = await ev(`document.querySelectorAll('button[aria-pressed="true"]').length`);
console.log("in-app Listen clicked:", clicked, "| badge:", badge || "(none)", "| buttons pressed at once:", playingCount);
ws.close(); chrome.kill(); process.exit(0);
