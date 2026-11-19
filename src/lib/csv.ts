/**
 * Small CSV parser for roster and registry uploads (RFC 4180: quoted fields, doubled quotes,
 * CRLF). Header row required. Runs in the browser for the preview and on the server again
 * before saving, so a tampered preview cannot bypass validation.
 */
export type CsvTable = { headers: string[]; rows: Record<string, string>[] };

export function parseCsv(text: string): CsvTable {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      record.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      record.push(field);
      field = "";
      if (record.some((v) => v.trim() !== "")) records.push(record);
      record = [];
    } else field += ch;
  }
  record.push(field);
  if (record.some((v) => v.trim() !== "")) records.push(record);

  const [headerRow = [], ...body] = records;
  const headers = headerRow.map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const rows = body.map((cells) => {
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] ?? "").trim();
    });
    return row;
  });
  return { headers, rows };
}
