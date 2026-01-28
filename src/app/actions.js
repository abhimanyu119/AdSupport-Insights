"use server";

import { PrismaClient } from "@prisma/client";
import Papa from "papaparse";

const prisma = new PrismaClient();

/* -------------------- CSV UPLOAD -------------------- */

export async function uploadCampaignData(formData) {
  const file = formData.get("csvFile");
  if (!file) throw new Error("No file uploaded");

  const csvText = await file.text();

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    throw new Error(
      "CSV parsing error: " + parsed.errors.map((e) => e.message).join(", "),
    );
  }

  const data = parsed.data.map((row) => ({
    campaign: row.campaign_name?.trim() || "Unknown Campaign",
    date: new Date(row.date),
    impressions: Number(row.impressions),
    clicks: Number(row.clicks),
    spend: Number(row.spend),
    conversions: Number(row.conversions),
  }));

  for (const row of data) {
    if ([row.impressions, row.clicks, row.spend, row.conversions].some(isNaN)) {
      throw new Error("Invalid numeric data in CSV");
    }
  }

  await prisma.issue.deleteMany({});
  await prisma.campaignData.deleteMany({});

  await prisma.campaignData.createMany({ data });

  await runDiagnostics();

  return { success: true };
}

/* -------------------- DIAGNOSTICS ENGINE -------------------- */

function expectedCTR(campaign) {
  const name = campaign.toLowerCase();
  if (name.includes("brand")) return 0.03;
  if (name.includes("search")) return 0.02;
  if (name.includes("performance")) return 0.01;
  if (name.includes("display")) return 0.005;
  return 0.01;
}

async function runDiagnostics() {
  const allData = await prisma.campaignData.findMany({
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
    const rows = campaigns[campaignName].sort((a, b) => a.date - b.date);

    const BASELINE_DAYS = 3;

    for (let i = 0; i < rows.length; i++) {
      const current = rows[i];
      const issues = [];

      /* -------- ZERO IMPRESSIONS -------- */
      if (current.impressions === 0) {
        issues.push({
          type: "ZERO_IMPRESSIONS",
          severity: "CRITICAL",
          notes: `${campaignName} spent $${current.spend} with zero impressions and ${current.clicks} clicks on ${current.date.toDateString()}, indicating a likely delivery failure.`,
        });
      }

      /* -------- HIGH SPEND NO CONVERSIONS -------- */
      if (current.spend > 500 && current.conversions === 0) {
        let severity = "MEDIUM";
        if (current.impressions === 0) severity = "CRITICAL";
        else if (current.clicks >= 10) severity = "HIGH";

        issues.push({
          type: "HIGH_SPEND_NO_CONVERSIONS",
          severity,
          notes: `${campaignName} spent $${current.spend} with zero conversions (${current.impressions} impressions, ${current.clicks} clicks) on ${current.date.toDateString()}, suggesting tracking or targeting issues.`,
        });
      }

      /* -------- LOW CTR -------- */
      if (current.impressions > 500) {
        const ctr = current.clicks / current.impressions;
        const threshold = expectedCTR(campaignName);

        if (ctr < threshold) {
          issues.push({
            type: "LOW_CTR",
            severity: "LOW",
            notes: `${campaignName} recorded ${(ctr * 100).toFixed(
              2,
            )}% CTR (${current.clicks} clicks from ${current.impressions} impressions, $${current.spend} spent) on ${current.date.toDateString()}. Review creative or audience relevance.`,
          });
        }
      }

      /* -------- SUDDEN DROP IMPRESSIONS -------- */
      if (i >= BASELINE_DAYS) {
        const baseline =
          rows
            .slice(i - BASELINE_DAYS, i)
            .reduce((sum, r) => sum + r.impressions, 0) / BASELINE_DAYS;

        if (baseline > 500 && current.impressions < baseline * 0.3) {
          issues.push({
            type: "SUDDEN_DROP_IMPRESSIONS",
            severity: "MEDIUM",
            notes: `${campaignName} impressions dropped ${(
              100 -
              (current.impressions / baseline) * 100
            ).toFixed(0)}% compared to recent performance (${baseline.toFixed(
              0,
            )} → ${current.impressions}) on ${current.date.toDateString()}. Investigate delivery, budget, or algorithm changes.`,
          });
        }
      }

      /* -------- DEDUPLICATED WRITE -------- */
      for (const issue of issues) {
        const existing = await prisma.issue.findFirst({
          where: {
            campaignDataId: current.id,
            type: issue.type,
          },
        });

        if (existing) {
          await prisma.issue.update({
            where: { id: existing.id },
            data: {
              severity: issue.severity,
              notes: issue.notes,
              updatedAt: new Date(),
            },
          });
        } else {
          await prisma.issue.create({
            data: {
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
}

/* -------------------- METRICS -------------------- */

export async function getMetrics() {
  const allData = await prisma.campaignData.findMany({
    orderBy: { date: "asc" },
  });

  if (allData.length === 0) {
    return {
      total: {
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
      },
    };
  }

  const sum = (key) => allData.reduce((s, d) => s + d[key], 0);

  const impressions = sum("impressions");
  const clicks = sum("clicks");
  const spend = sum("spend");
  const conversions = sum("conversions");

  return {
    total: {
      impressions,
      clicks,
      spend,
      conversions,
      ctr: clicks / impressions,
      conversionRate: conversions / clicks,
      cpc: spend / clicks,
    },
  };
}

/* -------------------- ISSUES -------------------- */

export async function getIssues() {
  const issues = await prisma.issue.findMany({
    include: { campaignData: true },
    orderBy: { createdAt: "desc" },
  });

  const priority = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };

  return issues.sort((a, b) => priority[a.severity] - priority[b.severity]);
}

/* -------------------- CHART DATA -------------------- */

export async function getChartData() {
  const data = await prisma.campaignData.findMany({
    orderBy: { date: "asc" },
  });

  return data.map((d) => ({
    date: d.date.toISOString().split("T")[0],
    campaign: d.campaign,
    impressions: d.impressions,
    clicks: d.clicks,
    spend: d.spend,
    conversions: d.conversions,
  }));
}

/* -------------------- ISSUE STATUS -------------------- */

export async function updateIssueStatus(id, status) {
  await prisma.issue.update({
    where: { id: Number(id) },
    data: { status },
  });
}
