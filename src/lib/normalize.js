import { Decimal } from "@prisma/client/runtime/library";
import prisma from "@/lib/prisma";

export function normalizeCsvRows(rows) {
  // expected CSV header:
  // campaign,date,impressions,clicks,spend,conversions

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

export function normalizeApiObjects(objs) {
  return objs.map((o) => ({
    campaign: o.campaign || "UNKNOWN",
    date: safeDate(o.date),
    impressions: safeInt(o.impressions),
    clicks: safeInt(o.clicks),
    spend: safeDecimal(o.spend),
    conversions: safeInt(o.conversions),
  }));
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

  // Group by campaign
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

      /* ZERO IMPRESSIONS */
      if (current.impressions === 0) {
        issues.push({
          type: "ZERO_IMPRESSIONS",
          severity: "CRITICAL",
          notes: `${campaignName} spent $${spend} with zero impressions on ${current.date.toDateString()}.`,
        });
      }

      /* HIGH SPEND NO CONVERSIONS */
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

      /* LOW CTR */
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

      /* SUDDEN DROP */
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

      /* UPSERT ISSUES */
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
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

function safeDecimal(v) {
  const n = Number(v);
  return Number.isFinite(n) ? new Decimal(n) : new Decimal(0);
}

function safeDate(v) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
