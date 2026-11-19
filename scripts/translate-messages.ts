/**
 * Drafts messages/<locale>.json for ig, yo, ha, pcm from messages/en.json using Gemini.
 *
 *   npm run translate            # translate only keys missing from each file
 *   npm run translate -- --all   # re-translate every key (overwrites drafts)
 *   npm run translate -- --list  # list files still marked machine-draft
 *
 * Every file written here gets "_status": "machine-draft". A native speaker must
 * review it and change the status to "reviewed" before the demo.
 * Needs GEMINI_API_KEY in .env.local (optional GEMINI_MODEL, default gemini-flash-latest).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

type Tree = { [key: string]: string | Tree };

const ROOT = join(__dirname, "..");
const MESSAGES = join(ROOT, "messages");
const TARGETS = {
  ig: "Igbo",
  yo: "Yoruba (with correct tone marks and dot-below letters ẹ ọ ṣ)",
  ha: "Hausa (Boko Latin script)",
  pcm: "Nigerian Pidgin",
} as const;

// Never translated: brand name and status markers.
const KEEP_AS_IS = ["Medisent AI"];

try {
  process.loadEnvFile(join(ROOT, ".env.local"));
} catch {
  // no .env.local: rely on the shell environment
}

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    if (key.startsWith("_")) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[path] = value;
    else Object.assign(out, flatten(value, path));
  }
  return out;
}

function unflatten(flat: Record<string, string>): Tree {
  const out: Tree = {};
  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split(".");
    let node = out;
    for (const part of parts.slice(0, -1)) {
      node[part] = (node[part] as Tree) ?? {};
      node = node[part] as Tree;
    }
    node[parts[parts.length - 1]] = value;
  }
  return out;
}

function readJson(file: string): Tree {
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
}

async function translate(language: string, strings: Record<string, string>) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set (add it to .env.local).");
  const model = process.env.GEMINI_MODEL ?? "gemini-flash-latest";

  const prompt = [
    `Translate the values of this JSON object from English into ${language}.`,
    "This is the interface of a medication app for Nigerian patients, many elderly or with low literacy.",
    "Use short, plain, warm, everyday words. Keep the meaning medically exact.",
    `Never translate these names: ${KEEP_AS_IS.join(", ")}.`,
    "Keep placeholders like {name} or {count} exactly as they are.",
    "Return a JSON object with exactly the same keys.",
    JSON.stringify(strings, null, 2),
  ].join("\n");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no text.");
  const parsed = JSON.parse(text) as Record<string, unknown>;

  const result: Record<string, string> = {};
  for (const key of Object.keys(strings)) {
    const value = parsed[key];
    if (typeof value !== "string") throw new Error(`Missing translation for "${key}".`);
    result[key] = value;
  }
  return result;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--list")) {
    for (const code of Object.keys(TARGETS)) {
      const status = readJson(join(MESSAGES, `${code}.json`))._status ?? "(missing)";
      console.log(`${code}.json: ${String(status)}`);
    }
    return;
  }

  const all = args.includes("--all");
  const source = flatten(readJson(join(MESSAGES, "en.json")));

  for (const [code, language] of Object.entries(TARGETS)) {
    const file = join(MESSAGES, `${code}.json`);
    const existing = all ? {} : flatten(readJson(file));
    const todo = Object.fromEntries(
      Object.entries(source).filter(([key]) => !(key in existing)),
    );

    // Drop keys no longer in en.json.
    const kept = Object.fromEntries(
      Object.entries(existing).filter(([key]) => key in source),
    );

    if (Object.keys(todo).length === 0) {
      console.log(`${code}: up to date`);
      continue;
    }
    console.log(`${code}: translating ${Object.keys(todo).length} keys…`);
    const translated = await translate(language, todo);

    const merged: Record<string, string> = {};
    for (const key of Object.keys(source)) merged[key] = translated[key] ?? kept[key];

    writeFileSync(
      file,
      JSON.stringify({ _status: "machine-draft", ...unflatten(merged) }, null, 2) + "\n",
      "utf8",
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
