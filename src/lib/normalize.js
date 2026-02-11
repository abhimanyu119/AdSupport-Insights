import { Decimal } from "@prisma/client/runtime/library";
import prisma from "@/lib/prisma";

/**
 * Platform-specific field mappings to standard schema
 */
const PLATFORM_FIELD_MAPS = {
  google: {
    campaign: [
      "campaign",
      "campaign_name",
      "campaignname",
      "name",
      "campaign name",
    ],
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

/* ================= NORMALIZATION ================= */

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

export function normalizeCsvRows(rows, platform = "google", headers = null) {
  if (!rows || rows.length === 0) return [];

  if (!headers) {
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

export function normalizeApiObjects(objs, platform = "google") {
  if (!objs || objs.length === 0) return [];

  const fieldMap = PLATFORM_FIELD_MAPS[platform] || PLATFORM_FIELD_MAPS.google;

  return objs.map((obj) => {
    const normalizedObj = {};
    for (const [key, value] of Object.entries(obj)) {
      const normalizedKey = key.toLowerCase().replace(/[_\s-]/g, "");
      normalizedObj[normalizedKey] = value;
    }

    const normalized = {
      campaign: "UNKNOWN",
      date: null,
      impressions: 0,
      clicks: 0,
      spend: new Decimal(0),
      conversions: 0,
    };

    for (const [standardField, variants] of Object.entries(fieldMap)) {
      for (const variant of variants) {
        const normalizedVariant = variant.toLowerCase().replace(/[_\s-]/g, "");
        if (normalizedObj[normalizedVariant] !== undefined) {
          const value = normalizedObj[normalizedVariant];

          switch (standardField) {
            case "campaign":
              normalized.campaign = String(value).trim() || "UNKNOWN";
              break;
            case "date":
              normalized.date = safeDate(value);
              break;
            case "impressions":
              normalized.impressions = safeInt(value);
              break;
            case "clicks":
              normalized.clicks = safeInt(value);
              break;
            case "spend":
              normalized.spend = safeDecimal(value);
              break;
            case "conversions":
              normalized.conversions = safeInt(value);
              break;
          }
          break;
        }
      }
    }

    if (!normalized.campaign || normalized.campaign === "UNKNOWN") {
      normalized.campaign =
        obj.campaign ??
        obj.campaign_name ??
        obj.campaignName ??
        normalizedObj.campaign ??
        "UNKNOWN";
    }

    return normalized;
  });
}

export function buildDiscardWarnings(rows) {
  const discarded = [];
  const valid = [];

  for (const row of rows) {
    if (
      !row.campaign &&
      !row.date &&
      !row.impressions &&
      !row.clicks &&
      !row.spend &&
      !row.conversions
    ) {
      continue;
    }

    const reasons = [];

    if (!row.campaign || row.campaign === "UNKNOWN")
      reasons.push("missing campaign");
    if (!row.date || isNaN(new Date(row.date).getTime()))
      reasons.push("invalid date");
    if (row.impressions < 0) reasons.push("negative impressions");
    if (row.clicks < 0) reasons.push("negative clicks");
    if (row.spend < 0) reasons.push("negative spend");
    if (row.conversions < 0) reasons.push("negative conversions");
    if (row.clicks > row.impressions) reasons.push("clicks > impressions");
    if (row.conversions > row.clicks) reasons.push("conversions > clicks");

    if (reasons.length > 0) discarded.push({ row, reasons });
    else valid.push(row);
  }

  const total = valid.length + discarded.length;
  const discardedPct =
    total === 0 ? 0 : Math.round((discarded.length / total) * 100);

  const warnings = [];

  if (discarded.length > 0) {
    warnings.push({
      level: discardedPct > 50 ? "CRITICAL" : "MEDIUM",
      message: `${discarded.length} / ${total} rows (${discardedPct}%) were discarded due to invalid data`,
      breakdown: discarded.reduce((acc, d) => {
        d.reasons.forEach((r) => {
          acc[r] = (acc[r] || 0) + 1;
        });
        return acc;
      }, {}),
    });
  }

  return { validRows: valid, warnings, discardedPct };
}

/* ================= ANOMALY DETECTION ================= */

function detectIssues(current, rows, index, spend) {
  const issues = [];

  if (current.impressions === 0) {
    issues.push({
      type: "ZERO_IMPRESSIONS",
      severity: "CRITICAL",
      notes: `Spent $${spend} with zero impressions`,
    });
  }

  if (spend > 500 && current.conversions === 0) {
    let severity = "MEDIUM";
    if (current.impressions === 0) severity = "CRITICAL";
    else if (current.clicks >= 10) severity = "HIGH";

    issues.push({
      type: "HIGH_SPEND_NO_CONVERSIONS",
      severity,
      notes: `Spent $${spend} with zero conversions`,
    });
  }

  if (current.impressions > 500) {
    const ctr = current.clicks / current.impressions;
    if (ctr < 0.005) {
      issues.push({
        type: "LOW_CTR",
        severity: "LOW",
        notes: `CTR ${(ctr * 100).toFixed(2)}%`,
      });
    }
  }

  if (index >= 3) {
    const baseline =
      rows.slice(index - 3, index).reduce((sum, r) => sum + r.impressions, 0) /
      3;

    if (baseline > 500 && current.impressions < baseline * 0.3) {
      issues.push({
        type: "SUDDEN_DROP_IMPRESSIONS",
        severity: "MEDIUM",
        notes: "Sudden drop vs baseline",
      });
    }
  }

  return issues;
}

/* ================= SAFE SERVERLESS DIAGNOSTICS ================= */

export async function runAnomalyDiagnosticsForRun(runId) {
  try {
    const allData = await prisma.campaignData.findMany({
      where: { runId },
      select: {
        id: true,
        campaign: true,
        date: true,
        impressions: true,
        clicks: true,
        spend: true,
        conversions: true,
      },
      orderBy: [{ campaign: "asc" }, { date: "asc" }],
    });

    if (allData.length === 0) {
      await prisma.analyticsRun.update({
        where: { id: runId },
        data: {
          rawPayload: {
            diagnosticsComplete: true,
            diagnosticsCompletedAt: new Date().toISOString(),
          },
        },
      });
      return;
    }

    const campaignMap = new Map();
    for (const row of allData) {
      if (!campaignMap.has(row.campaign)) {
        campaignMap.set(row.campaign, []);
      }
      campaignMap.get(row.campaign).push(row);
    }

    const issueGroupsMap = new Map();
    const occurrencesToCreate = [];
    const severityRank = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

    for (const [campaignName, rows] of campaignMap) {
      for (let i = 0; i < rows.length; i++) {
        const current = rows[i];
        const spend = Number(current.spend);
        const issues = detectIssues(current, rows, i, spend);

        for (const issue of issues) {
          const key = `${campaignName}_${issue.type}`;

          if (!issueGroupsMap.has(key)) {
            issueGroupsMap.set(key, {
              runId,
              campaign: campaignName,
              type: issue.type,
              severity: issue.severity,
            });
          } else {
            const existing = issueGroupsMap.get(key);
            if (
              severityRank[issue.severity] > severityRank[existing.severity]
            ) {
              existing.severity = issue.severity;
            }
          }

          occurrencesToCreate.push({
            campaignName,
            type: issue.type,
            campaignDataId: current.id,
            date: current.date,
            notes: issue.notes,
          });
        }
      }
    }

    const issueGroupsArray = Array.from(issueGroupsMap.values());

    const GROUP_BATCH_SIZE = 200;
    for (let i = 0; i < issueGroupsArray.length; i += GROUP_BATCH_SIZE) {
      await prisma.issueGroup.createMany({
        data: issueGroupsArray.slice(i, i + GROUP_BATCH_SIZE),
        skipDuplicates: true,
      });
    }

    const relevantCampaigns = [
      ...new Set(issueGroupsArray.map((g) => g.campaign)),
    ];

    const createdGroups = await prisma.issueGroup.findMany({
      where: { runId, campaign: { in: relevantCampaigns } },
      select: { id: true, campaign: true, type: true },
    });

    const groupLookup = new Map();
    for (const g of createdGroups) {
      groupLookup.set(`${g.campaign}_${g.type}`, g.id);
    }

    const occurrenceData = occurrencesToCreate
      .map((occ) => ({
        issueGroupId: groupLookup.get(`${occ.campaignName}_${occ.type}`),
        campaignDataId: occ.campaignDataId,
        date: occ.date,
        notes: occ.notes,
      }))
      .filter((o) => o.issueGroupId);

    const OCC_BATCH = 300;
    for (let i = 0; i < occurrenceData.length; i += OCC_BATCH) {
      await prisma.issueOccurrence.createMany({
        data: occurrenceData.slice(i, i + OCC_BATCH),
        skipDuplicates: true,
      });
    }

    await prisma.analyticsRun.update({
      where: { id: runId },
      data: {
        rawPayload: {
          diagnosticsComplete: true,
          diagnosticsCompletedAt: new Date().toISOString(),
          issueGroupCount: issueGroupsArray.length,
          occurrenceCount: occurrenceData.length,
        },
      },
    });
  } catch (error) {
    console.error(`Diagnostics failed for run ${runId}:`, error);

    await prisma.analyticsRun
      .update({
        where: { id: runId },
        data: {
          rawPayload: {
            diagnosticsComplete: false,
            diagnosticsFailed: true,
            diagnosticsError: error.message,
            diagnosticsFailedAt: new Date().toISOString(),
          },
        },
      })
      .catch(() => {});

    throw error;
  }
}

/* ================= HELPERS ================= */

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
