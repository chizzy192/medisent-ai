import { readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

/**
 * "Reset demo data": runs supabase/reset.sql then supabase/seed.sql over a direct Postgres
 * connection (DATABASE_URL, the Supabase transaction-pooler URI). Platform admin only, demo
 * mode only; both files ship with the app so Vercel can run them.
 */
export async function resetDemoData(): Promise<{ ok: true; ms: number } | { ok: false; error: string }> {
  const url = process.env.DATABASE_URL;
  if (!url) return { ok: false, error: "DATABASE_URL is not set" };
  const started = Date.now();
  const root = process.cwd();
  const [reset, seed] = await Promise.all([readFile(path.join(root, "supabase", "reset.sql"), "utf8"), readFile(path.join(root, "supabase", "seed.sql"), "utf8")]);
  const client = new Client({ connectionString: url, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false }, statement_timeout: 120_000 });
  await client.connect();
  try {
    await client.query(reset);
    await client.query(seed);
    return { ok: true, ms: Date.now() - started };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    await client.end().catch(() => undefined);
  }
}
