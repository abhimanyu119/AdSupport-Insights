import { Decimal } from "@prisma/client/runtime/library";
import prisma from "@/lib/prisma";

/**
 * Platform-specific field mappings to standard schema
 */
const PLATFORM_FIELD_MAPS = {
  google: {
    campaign: ["campaign", "campaign_name", "campaignname"],
    date: ["day", "date", "date_served"],
    impressions: ["impressions", "impr"],
    clicks: ["clicks"],
    spend: ["cost", "spend", "cost_micros"],
    conversions: ["conversions", "conv", "all_conversions"],
  },
  meta: {
    campaign: ["campaign_name", "campaign name", "campaign", "campaignname"],
    date: ["date_start", "datestart", "date start", "date", "day"],
    impressions: ["impressions", "reach"],
    clicks: ["clicks", "link_clicks", "link clicks"],
    spend: ["spend", "amount_spent"],
    conversions: ["conversions", "purchases", "actions"],
  },
  amazon: {
    campaign: ["campaign", "campaign_name"],
    date: ["date", "day"],
    impressions: ["impressions"],
    clicks: ["clicks"],
    spend: ["cost", "spend"],
    conversions: ["conversions", "orders", "purchases"],
  },
  flipkart: {
    campaign: ["campaign", "campaign_name"],
    date: ["date", "day"],
    impressions: ["impressions", "views"],
    clicks: ["clicks"],
    spend: ["spend", "cost"],
    conversions: ["conversions", "orders"],
  },
  linkedin: {
    campaign: ["campaign_name", "campaign name", "campaign"],
    date: ["start_at", "startat", "start at", "date", "day"],
    impressions: ["impressions"],
    clicks: ["clicks"],
    spend: [
      "cost_in_local_currency",
      "costinlocalcurrency",
      "cost in local currency",
      "spend",
      "cost",
    ],
    conversions: ["conversions", "leads"],
  },
  twitter: {
    campaign: ["campaign_name", "campaign name", "campaign"],
    date: ["date", "day"],
    impressions: ["impressions"],
    clicks: ["clicks", "url_clicks", "url clicks", "urlclicks"],
    spend: ["spend", "billed_charge_local_micro"],
    conversions: ["conversions"],
  },
};

/**
 * Find which CSV column index corresponds to a standard field
 */
function findColumnIndex(headers, fieldVariants) {
  const normalizedHeaders = headers.map((h) =>
    h.toLowerCase().replace(/[_\s-]/g, ""),
  );

  for (const variant of fieldVariants) {
    const normalizedVariant = variant.toLowerCase().replace(/[_\s-]/g, "");
    const index = normalizedHeaders.findIndex((h) => h === normalizedVariant);
    if (index !== -1) return index;
  }

  return -1;
}

/**
 * Build column mapping for a platform
 */
function buildColumnMapping(headers, platform) {
  const fieldMap = PLATFORM_FIELD_MAPS[platform] || PLATFORM_FIELD_MAPS.google;
  const mapping = {};

  for (const [standardField, variants] of Object.entries(fieldMap)) {
    const colIndex = findColumnIndex(headers, variants);
    if (colIndex !== -1) {
      mapping[standardField] = colIndex;
    }
  }

  return mapping;
}

/**
 * Normalize CSV rows with platform-aware field mapping
 * @param {string[]} rows - Array of CSV row strings
 * @param {string} platform - Platform identifier (google, meta, amazon, etc.)
 * @param {string[]} headers - CSV header row split into array
 */
export function normalizeCsvRows(rows, platform = "google", headers = null) {
  if (!rows || rows.length === 0) return [];

  // If headers not provided, assume standard order for backward compatibility
  if (!headers) {
    // Old behavior: date,campaign,impressions,clicks,spend,conversions
    return rows.map((line, index) => {
      const [date, campaign, impressions, clicks, spend, conversions] =
        line.split(",");

      return {
        campaign: campaign?.trim() || "UNKNOWN",
        date: safeDate(date),
        impressions: safeInt(impressions),
        clicks: safeInt(clicks),
        spend: safeDecimal(spend),
        conversions: safeInt(conversions),
        _line: index + 1,
      };
    });
  }

  // New behavior: use platform-aware mapping
  const columnMapping = buildColumnMapping(headers, platform);

  return rows.map((line, index) => {
    const values = line.split(",").map((v) => v.trim());

    return {
      campaign:
        (columnMapping.campaign !== undefined
          ? values[columnMapping.campaign]
          : null) || "UNKNOWN",
      date: safeDate(
        columnMapping.date !== undefined ? values[columnMapping.date] : null,
      ),
      impressions: safeInt(
        columnMapping.impressions !== undefined
          ? values[columnMapping.impressions]
          : null,
      ),
      clicks: safeInt(
        columnMapping.clicks !== undefined
          ? values[columnMapping.clicks]
          : null,
      ),
      spend: safeDecimal(
        columnMapping.spend !== undefined ? values[columnMapping.spend] : null,
      ),
      conversions: safeInt(
        columnMapping.conversions !== undefined
          ? values[columnMapping.conversions]
          : null,
      ),
      _line: index + 1,
    };
  });
}

/**
 * Normalize API objects with platform-aware field mapping
 * @param {Object[]} objs - Array of API response objects
 * @param {string} platform - Platform identifier (google, meta, amazon, etc.)
 */
export function normalizeApiObjects(objs, platform = "google") {
  if (!objs || objs.length === 0) return [];

  const fieldMap = PLATFORM_FIELD_MAPS[platform] || PLATFORM_FIELD_MAPS.google;

  return objs.map((obj) => {
    const normalized = {
      campaign: "UNKNOWN",
      date: null,
      impressions: 0,
      clicks: 0,
      spend: new Decimal(0),
      conversions: 0,
    };

    // Find each standard field from possible API response keys
    for (const [standardField, variants] of Object.entries(fieldMap)) {
      for (const variant of variants) {
        if (obj[variant] !== undefined) {
          switch (standardField) {
            case "campaign":
              normalized.campaign = obj[variant] || "UNKNOWN";
              break;
            case "date":
              normalized.date = safeDate(obj[variant]);
              break;
            case "impressions":
              normalized.impressions = safeInt(obj[variant]);
              break;
            case "clicks":
              normalized.clicks = safeInt(obj[variant]);
              break;
            case "spend":
              normalized.spend = safeDecimal(obj[variant]);
              break;
            case "conversions":
              normalized.conversions = safeInt(obj[variant]);
              break;
          }
          break; // Found the field, stop looking for variants
        }
      }
    }

    return normalized;
  });
}

export function runPreflightDiagnostics(rows) {
  const warnings = [];

  const zeroImpressions = rows.filter((r) => r.impressions === 0).length;
  const highSpendNoConv = rows.filter(
    (r) => r.spend > 0 && r.conversions === 0,
  ).length;

  if (zeroImpressions > 0) {
    warnings.push({
      level: "MEDIUM",
      message: `${zeroImpressions} rows have zero impressions`,
    });
  }

  if (highSpendNoConv > 0) {
    warnings.push({
      level: "HIGH",
      message: `${highSpendNoConv} rows have spend but no conversions`,
    });
  }

  return warnings;
}

const BASELINE_DAYS = 3;

export async function runAnomalyDiagnosticsForRun(runId) {
  const allData = await prisma.campaignData.findMany({
    where: { runId },
    orderBy: { date: "asc" },
  });

  if (allData.length === 0) return;

  const campaigns = {};
  for (const row of allData) {
    if (!campaigns[row.campaign]) campaigns[row.campaign] = [];
    campaigns[row.campaign].push(row);
  }

  for (const campaignName in campaigns) {
    const rows = campaigns[campaignName];

    for (let i = 0; i < rows.length; i++) {
      const current = rows[i];
      const issues = [];
      const spend = Number(current.spend);

      if (current.impressions === 0) {
        issues.push({
          type: "ZERO_IMPRESSIONS",
          severity: "CRITICAL",
          notes: `${campaignName} spent $${spend} with zero impressions on ${current.date.toDateString()}.`,
        });
      }

      if (spend > 500 && current.conversions === 0) {
        let severity = "MEDIUM";
        if (current.impressions === 0) severity = "CRITICAL";
        else if (current.clicks >= 10) severity = "HIGH";

        issues.push({
          type: "HIGH_SPEND_NO_CONVERSIONS",
          severity,
          notes: `${campaignName} spent $${spend} with zero conversions on ${current.date.toDateString()}.`,
        });
      }

      if (current.impressions > 500) {
        const ctr = current.clicks / current.impressions;
        if (ctr < 0.005) {
          issues.push({
            type: "LOW_CTR",
            severity: "LOW",
            notes: `${campaignName} CTR ${(ctr * 100).toFixed(2)}% on ${current.date.toDateString()}.`,
          });
        }
      }

      if (i >= BASELINE_DAYS) {
        const baseline =
          rows
            .slice(i - BASELINE_DAYS, i)
            .reduce((sum, r) => sum + r.impressions, 0) / BASELINE_DAYS;

        if (baseline > 500 && current.impressions < baseline * 0.3) {
          issues.push({
            type: "SUDDEN_DROP_IMPRESSIONS",
            severity: "MEDIUM",
            notes: `${campaignName} impressions dropped sharply on ${current.date.toDateString()}.`,
          });
        }
      }

      for (const issue of issues) {
        await prisma.issue.upsert({
          where: {
            campaignDataId_type: {
              campaignDataId: current.id,
              type: issue.type,
            },
          },
          update: {
            severity: issue.severity,
            notes: issue.notes,
          },
          create: {
            campaignDataId: current.id,
            type: issue.type,
            severity: issue.severity,
            notes: issue.notes,
          },
        });
      }
    }
  }
}

/* helpers */

function safeInt(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

function safeDecimal(v) {
  if (v === null || v === undefined || v === "") return new Decimal(0);
  const n = Number(v);
  return Number.isFinite(n) ? new Decimal(n) : new Decimal(0);
}

function safeDate(v) {
  if (v === null || v === undefined || v === "") return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
