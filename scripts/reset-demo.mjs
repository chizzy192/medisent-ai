// Resets the demo database from the command line: supabase/reset.sql then supabase/seed.sql over
// DATABASE_URL (from the environment or .env.local). Same files the in-app "Reset demo data"
// button runs. Run: node scripts/reset-demo.mjs
import { existsSync, readFileSync } from "node:fs";
import pg from "pg";

function envKey(name) {
  if (process.env[name]) return process.env[name];
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    const line = readFileSync(file, "utf8").split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
    if (line) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

const url = envKey("DATABASE_URL");
if (!url) {
  console.error("DATABASE_URL is not set. Supabase → Connect → Transaction pooler URI, into .env.local.");
  process.exit(1);
}
const client = new pg.Client({ connectionString: url, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
await client.connect();
const t0 = Date.now();
try {
  await client.query(readFileSync("supabase/reset.sql", "utf8"));
  console.log("reset.sql done");
  await client.query(readFileSync("supabase/seed.sql", "utf8"));
  console.log(`seed.sql done (${Date.now() - t0} ms). Demo data is back to its seeded state.`);
} catch (e) {
  await client.query("rollback").catch(() => undefined);
  console.error("reset failed:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
