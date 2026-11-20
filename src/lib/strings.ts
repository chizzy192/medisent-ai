import { strings } from "@/content/strings";

/**
 * English-only UI text (owner decision, 2026-11-19: Medisent AI is English only).
 * `tr("signup")` returns a function `t(key, values)` that reads `strings.signup.<key>` (dotted
 * keys allowed), fills `{name}` placeholders and resolves ICU-style plurals
 * (`{count, plural, =0 {none} one {# day} other {# days}}`). `t.has(key)` tells whether a key exists.
 */
type Tree = { [key: string]: string | Tree };
export type Values = Record<string, string | number | null | undefined>;

function lookup(root: Tree, path: string): string | undefined {
  let node: string | Tree | undefined = root;
  for (const part of path.split(".")) {
    if (!node || typeof node === "string") return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

/** Splits a brace-delimited argument list respecting nested braces: "=0 {a} one {b} other {c}". */
function pluralBranches(spec: string): Record<string, string> {
  const out: Record<string, string> = {};
  let i = 0;
  while (i < spec.length) {
    while (i < spec.length && spec[i] === " ") i++;
    const start = i;
    while (i < spec.length && spec[i] !== "{" && spec[i] !== " ") i++;
    const selector = spec.slice(start, i).trim();
    while (i < spec.length && spec[i] === " ") i++;
    if (spec[i] !== "{") break;
    let depth = 0;
    const bodyStart = i + 1;
    for (; i < spec.length; i++) {
      if (spec[i] === "{") depth++;
      else if (spec[i] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    out[selector] = spec.slice(bodyStart, i);
    i++;
  }
  return out;
}

export function format(template: string, values: Values = {}): string {
  let out = "";
  let i = 0;
  while (i < template.length) {
    const open = template.indexOf("{", i);
    if (open === -1) {
      out += template.slice(i);
      break;
    }
    out += template.slice(i, open);
    let depth = 0;
    let close = open;
    for (; close < template.length; close++) {
      if (template[close] === "{") depth++;
      else if (template[close] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    const inner = template.slice(open + 1, close);
    const comma = inner.indexOf(",");
    if (comma === -1) {
      const v = values[inner.trim()];
      out += v === null || v === undefined ? "" : String(v);
    } else {
      const name = inner.slice(0, comma).trim();
      const rest = inner.slice(comma + 1).trim();
      const n = Number(values[name] ?? 0);
      if (rest.startsWith("plural,")) {
        const branches = pluralBranches(rest.slice("plural,".length));
        const chosen = branches[`=${n}`] ?? (n === 1 ? branches.one : undefined) ?? branches.other ?? "";
        out += format(chosen.replace(/#/g, String(n)), values);
      } else {
        out += String(values[name] ?? "");
      }
    }
    i = close + 1;
  }
  return out;
}

export type Translator = ((key: string, values?: Values) => string) & { has: (key: string) => boolean };

export function tr(namespace?: string): Translator {
  const root = (namespace ? (lookup(strings as Tree, namespace) ?? (strings as Tree)[namespace]) : strings) as Tree;
  const t = ((key: string, values?: Values) => {
    const s = lookup(root, key);
    if (s === undefined) {
      if (process.env.NODE_ENV !== "production") console.warn(`[strings] missing ${namespace ? `${namespace}.` : ""}${key}`);
      return key;
    }
    return format(s, values);
  }) as Translator;
  t.has = (key: string) => lookup(root, key) !== undefined;
  return t;
}

/** Dates and times for Nigeria (English, Africa/Lagos). */
export function formatDate(date: Date | string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", ...options }).format(typeof date === "string" ? new Date(date) : date);
}
