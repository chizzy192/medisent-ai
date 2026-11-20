/** Gemini structured text answers (JSON) for the assistant and the check-in parser. Model list as in scan.ts. */
const models = [process.env.GEMINI_MODEL, "gemini-flash-lite-latest", "gemini-3-flash-preview", "gemini-flash-latest"].filter(Boolean) as string[];

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function generateJson<T>(system: string, user: string, schema: unknown, temperature = 0.2): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature, maxOutputTokens: 600 },
  });
  let lastError = "";
  for (const model of models) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(30_000),
    });
    if (res.status === 404 || res.status === 503 || res.status === 429) {
      lastError = `${model}: ${res.status}`;
      continue;
    }
    if (!res.ok) throw new Error(`Gemini ${model}: ${res.status} ${(await res.text()).slice(0, 200)}`);
    const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error(`Gemini ${model}: empty answer`);
    return JSON.parse(text) as T;
  }
  throw new Error(`No Gemini model answered (${lastError})`);
}
