import { normalizeRow } from "./normalize";

export function adaptRows(rawRows, platform) {
  const warnings = { low: 0, medium: 0 };
  const rows = [];

  for (const raw of rawRows) {
    const row = normalizeRow(raw, warnings);
    if (row) rows.push(row);
  }

  return { rows, warnings, platform };
}

export function detectPlatform(rows) {
  if (rows.some((r) => "adset_name" in r)) return "meta";
  if (rows.some((r) => "campaign_name" in r)) return "google";
  return "unknown";
}
