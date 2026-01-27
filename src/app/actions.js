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

  // Save to DB
  await prisma.campaignData.createMany({
    data,
    skipDuplicates: true, // assuming date is unique
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

  // Simple rules
  for (const data of allData) {
    const issues = [];

    // Zero impressions
    if (data.impressions === 0) {
      issues.push({
        type: "ZERO_IMPRESSIONS",
        notes: `Zero impressions on ${data.date.toDateString()}. Possible delivery issue.`,
      });
    }

    // High spend no conversions
    if (data.spend > 100 && data.conversions === 0) {
      issues.push({
        type: "HIGH_SPEND_NO_CONVERSIONS",
        notes: `High spend (${data.spend}) with zero conversions on ${data.date.toDateString()}. Check tracking or targeting.`,
      });
    }

    // Low CTR
    const ctr = data.clicks / data.impressions;
    if (data.impressions > 0 && ctr < 0.01) {
      issues.push({
        type: "LOW_CTR",
        notes: `Low CTR (${(ctr * 100).toFixed(2)}%) on ${data.date.toDateString()}. Review creative or relevance.`,
      });
    }

    // Sudden drop in impressions (compare with previous day)
    const prevData = allData.find(
      (d) => d.date.getTime() === data.date.getTime() - 24 * 60 * 60 * 1000,
    );
    if (
      prevData &&
      prevData.impressions > 0 &&
      data.impressions / prevData.impressions < 0.5
    ) {
      issues.push({
        type: "SUDDEN_DROP_IMPRESSIONS",
        notes: `Sudden drop in impressions from ${prevData.impressions} to ${data.impressions} on ${data.date.toDateString()}. Possible performance regression.`,
      });
    }

    // Create issues
    for (const issue of issues) {
      await prisma.issue.create({
        data: {
          campaignDataId: data.id,
          type: issue.type,
          notes: issue.notes,
        },
      });
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
  return await prisma.issue.findMany({
    include: {
      campaignData: true,
    },
    orderBy: { createdAt: "desc" },
  });
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
