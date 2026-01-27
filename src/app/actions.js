"use server";

import { PrismaClient } from "@prisma/client";
import Papa from "papaparse";

const prisma = new PrismaClient();

export async function uploadCampaignData(formData) {
  const file = formData.get("csvFile");
  if (!file) {
    throw new Error("No file uploaded");
  }

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
    campaign: row.campaign_name || "Unknown Campaign",
    date: new Date(row.date),
    impressions: parseInt(row.impressions),
    clicks: parseInt(row.clicks),
    spend: parseFloat(row.spend),
    conversions: parseInt(row.conversions),
  }));

  // Validate data
  for (const row of data) {
    if (
      isNaN(row.impressions) ||
      isNaN(row.clicks) ||
      isNaN(row.spend) ||
      isNaN(row.conversions)
    ) {
      throw new Error("Invalid data in CSV");
    }
  }

  // Clear existing data before uploading new data
  await prisma.campaignData.deleteMany({});
  await prisma.issue.deleteMany({});

  // Save to DB
  await prisma.campaignData.createMany({
    data,
  });

  // Run diagnostics
  await runDiagnostics();

  return { success: true };
}

async function runDiagnostics() {
  // Get all data
  const allData = await prisma.campaignData.findMany({
    orderBy: { date: "asc" },
  });

  if (allData.length < 2) return; // need at least 2 for comparisons

  // Severity mapping
  const severityMap = {
    ZERO_IMPRESSIONS: "CRITICAL",
    HIGH_SPEND_NO_CONVERSIONS: "HIGH",
    SUDDEN_DROP_IMPRESSIONS: "MEDIUM",
    LOW_CTR: "LOW",
  };

  // Simple rules
  for (const data of allData) {
    const issues = [];

    // Zero impressions (CRITICAL)
    if (data.impressions === 0) {
      issues.push({
        type: "ZERO_IMPRESSIONS",
        severity: "CRITICAL",
        notes: `${data.campaign} spent $${data.spend} with zero impressions and ${data.clicks} clicks on ${data.date.toDateString()}, indicating likely delivery failure.`,
      });
    }

    // High spend no conversions (HIGH)
    if (data.spend > 100 && data.conversions === 0) {
      issues.push({
        type: "HIGH_SPEND_NO_CONVERSIONS",
        severity: "HIGH",
        notes: `${data.campaign} spent $${data.spend} with zero conversions (${data.impressions} impressions, ${data.clicks} clicks) on ${data.date.toDateString()}, indicating tracking or targeting issues.`,
      });
    }

    // Low CTR (LOW)
    const ctr = data.clicks / data.impressions;
    if (data.impressions > 0 && ctr < 0.01) {
      issues.push({
        type: "LOW_CTR",
        severity: "LOW",
        notes: `${data.campaign} has ${(ctr * 100).toFixed(2)}% CTR (${data.clicks} clicks from ${data.impressions} impressions, $${data.spend} spent) on ${data.date.toDateString()}. Review creative or audience relevance.`,
      });
    }

    // Sudden drop in impressions (MEDIUM) - improved logic
    const prevData = allData.find(
      (d) =>
        d.campaign === data.campaign &&
        d.date.getTime() === data.date.getTime() - 24 * 60 * 60 * 1000,
    );
    if (
      prevData &&
      prevData.impressions > 500 && // minimum baseline
      data.impressions / prevData.impressions < 0.3 // 70% drop threshold
    ) {
      issues.push({
        type: "SUDDEN_DROP_IMPRESSIONS",
        severity: "MEDIUM",
        notes: `${data.campaign} impressions dropped ${(100 - (data.impressions / prevData.impressions) * 100).toFixed(0)}% from ${prevData.impressions} to ${data.impressions} (${data.clicks} clicks, $${data.spend} spent) on ${data.date.toDateString()}. Investigate account or algorithm changes.`,
      });
    }

    // Create or update issues with deduplication
    for (const issue of issues) {
      // Check if issue already exists for this campaign+date+type combination
      const existingIssue = await prisma.issue.findFirst({
        where: {
          campaignData: {
            campaign: data.campaign,
            date: data.date,
          },
          type: issue.type,
        },
      });

      if (existingIssue) {
        // Update existing issue
        await prisma.issue.update({
          where: { id: existingIssue.id },
          data: {
            notes: issue.notes,
            severity: issue.severity,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new issue
        await prisma.issue.create({
          data: {
            campaignDataId: data.id,
            type: issue.type,
            severity: issue.severity,
            notes: issue.notes,
          },
        });
      }
    }
  }
}

export async function getMetrics() {
  try {
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
          ctr: 0,
          conversionRate: 0,
          cpc: 0,
        },
        last7: null,
        prev7: null,
      };
    }

    const totalImpressions = allData.reduce((sum, d) => sum + d.impressions, 0);
    const totalClicks = allData.reduce((sum, d) => sum + d.clicks, 0);
    const totalSpend = allData.reduce((sum, d) => sum + d.spend, 0);
    const totalConversions = allData.reduce((sum, d) => sum + d.conversions, 0);

    const ctr = totalClicks / totalImpressions;
    const conversionRate = totalConversions / totalClicks;
    const cpc = totalSpend / totalClicks;

    // Time-based: last 7 days vs previous 7 days
    const now = new Date();
    const last7 = allData.filter(
      (d) => d.date >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    );
    const prev7 = allData.filter(
      (d) =>
        d.date >= new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) &&
        d.date < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    );

    const last7Metrics =
      last7.length > 0
        ? {
            impressions: last7.reduce((sum, d) => sum + d.impressions, 0),
            clicks: last7.reduce((sum, d) => sum + d.clicks, 0),
            spend: last7.reduce((sum, d) => sum + d.spend, 0),
            conversions: last7.reduce((sum, d) => sum + d.conversions, 0),
          }
        : null;

    const prev7Metrics =
      prev7.length > 0
        ? {
            impressions: prev7.reduce((sum, d) => sum + d.impressions, 0),
            clicks: prev7.reduce((sum, d) => sum + d.clicks, 0),
            spend: prev7.reduce((sum, d) => sum + d.spend, 0),
            conversions: prev7.reduce((sum, d) => sum + d.conversions, 0),
          }
        : null;

    return {
      total: {
        impressions: totalImpressions,
        clicks: totalClicks,
        spend: totalSpend,
        conversions: totalConversions,
        ctr,
        conversionRate,
        cpc,
      },
      last7: last7Metrics,
      prev7: prev7Metrics,
    };
  } catch (error) {
    console.error("Error in getMetrics:", error);
    // Return default empty metrics on error
    return {
      total: {
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
        ctr: 0,
        conversionRate: 0,
        cpc: 0,
      },
      last7: null,
      prev7: null,
    };
  }
}

export async function getIssues() {
  const issues = await prisma.issue.findMany({
    include: {
      campaignData: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Sort by severity priority: CRITICAL > HIGH > MEDIUM > LOW
  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  return issues.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );
}

export async function getChartData() {
  const data = await prisma.campaignData.findMany({
    orderBy: { date: "asc" },
  });
  return data.map((d) => ({
    date: d.date.toISOString().split("T")[0],
    impressions: d.impressions,
    clicks: d.clicks,
    spend: d.spend,
    conversions: d.conversions,
  }));
}

export async function updateIssueStatus(id, status) {
  await prisma.issue.update({
    where: { id: parseInt(id) },
    data: { status },
  });
}
